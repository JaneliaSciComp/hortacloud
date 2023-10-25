const { CognitoIdentityProviderClient,
        AdminCreateUserCommand,
        AdminAddUserToGroupCommand,
        AdminListGroupsForUserCommand,
        CreateGroupCommand,
        ListGroupsCommand,
        ListUsersCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { PassThrough, Readable } = require('stream');

const USERS_FILENAME = 'users.json';
const GROUPS_FILENAME = 'groups.json';

const DEFAULT_POOL_ID = process.env.DEFAULT_USER_POOL_ID;

async function cognitoExport(event) {

    const { poolId, backupBucket, backupPrefix } = event;

    const userPoolId = poolId ? poolId : DEFAULT_POOL_ID;

    if (!userPoolId) {
        throw new Error("No user pool ID has been specified, either as a parameter or in the environment");
    }

    const cognitoClient = new CognitoIdentityProviderClient();
    const s3Client = new S3Client();

    await exportData(s3Client, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, USERS_FILENAME),
        backupData: fetchAllUsers(cognitoClient, userPoolId),
    });

    await exportData(s3Client, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, GROUPS_FILENAME),
        backupData: fetchAllGroups(cognitoClient, userPoolId),
    });

    return {
        statusCode: 200
    };
}

async function cognitoImport(event) {
    const { poolId, backupBucket, backupPrefix } = event;

    const userPoolId = poolId ? poolId : DEFAULT_POOL_ID;

    if (!userPoolId) {
        throw new Error("No user pool ID has been specified, either as a parameter or in the environment");
    }

    const cognitoClient = new CognitoIdentityProviderClient();
    const s3Client = new S3Client();

    await importGroups(cognitoClient, userPoolId, await getS3Content(s3Client, backupBucket, createLocation(backupPrefix, GROUPS_FILENAME)));
    await importUsers(cognitoClient, userPoolId, await getS3Content(s3Client, backupBucket, createLocation(backupPrefix, USERS_FILENAME)));

    return {
        statusCode: 200
    };
}

function createLocation(prefix, name) {
    const location = prefix ? `${prefix}/${name}` : name;
    return location.startsWith('/') ? location.substring(1) : location;
}

async function exportData(s3Client, backupParams) {
    const uploadStream = new PassThrough();

    const upload = new Upload({
        client: s3Client,

        params: {
            Bucket: backupParams.backupBucket,
            Key: backupParams.backupFile,
            Body: uploadStream,
            ContentType: 'application/json'
        }
    });
    const dataStream = Readable.from(jsonArrayStream(backupParams.backupData));

    dataStream.pipe(uploadStream);
    dataStream.on('end', () => {
        console.log('Finished writing the data stream');
    });

    try {
        await upload.done();
    } catch (error) {
        throw error;
    }
}

async function* jsonArrayStream(iterableData) {
    yield '[';
    let i = 0;
    for await (const d of iterableData) {
        const s = asString(d);
        if (i === 0) {
            yield s;
        } else {
            yield `,\n${s}`;
        }
        i++;
    }
    yield ']';
}

async function* fetchAllUsers(cognitoClient, userPoolId) {
    let cachedUsers = undefined;
    let userIndex = 0;
    let listUsersCommand = new ListUsersCommand({
        UserPoolId: userPoolId,
    })
    let count = 0;
    while (true) {
        if (cachedUsers === undefined || (userIndex >= cachedUsers.length && listUsersCommand.PaginationToken)) {
            const { Users = [], PaginationToken } = await cognitoClient.send(listUsersCommand);
            listUsersCommand.PaginationToken = PaginationToken;
            cachedUsers = Users;
            userIndex = 0;
        }
        if (userIndex < cachedUsers.length) {
            const nextUser = cachedUsers[userIndex++];
            if (!nextUser.Username) {
                continue;
            }
            nextUser.UserGroups = await fetchUserGroups(cognitoClient, userPoolId, nextUser.Username);
            count++;
            yield nextUser;
        } else if (!listUsersCommand.PaginationToken) {
            // done
            break;
        }
    }
    console.log(`Fetched ${count} cognito users`);
    return count;
}

async function* fetchAllGroups(cognitoClient, userPoolId) {
    let cachedGroups = undefined;
    let groupIndex = 0;
    let listGroupsCommand = new ListGroupsCommand({
        UserPoolId: userPoolId,
    })
    let count = 0;
    while (true) {
        if (cachedGroups === undefined || (groupIndex >= cachedGroups.length && listGroupsCommand.NextToken)) {
            const { Groups = [], NextToken } = await cognitoClient.send(listGroupsCommand);
            listGroupsCommand.NextToken = NextToken;
            cachedGroups = Groups;
            groupIndex = 0;
        }
        if (groupIndex < cachedGroups.length) {
            const nextUser = cachedGroups[groupIndex++];
            count++;
            yield nextUser;
        } else if (!listGroupsCommand.NextToken) {
            // done
            break;
        }
    }
    console.log(`Fetched ${count} cognito groups`);
    return count;
}

async function fetchUserGroups(cognitoClient, userPoolId, username) {
    console.log(`Fetch user groups for ${username}`);
    const listUserGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: username
    });
    // This is typically small so I am not using any pagination here
    const { Groups = [] } = await cognitoClient.send(listUserGroupsCommand);
    return Groups;
}

function asString(d) {
    return JSON.stringify(d);
};

async function importGroups(cognitoClient, userPoolId, groups) {
    const createGroupPromises = await groups.map(async g => {
        const newGroupParams = {
            UserPoolId: userPoolId,
            GroupName: g.GroupName,
            Description: g.Description,
            Precedence: g.Precedence,
        };
        try {
            console.log('Create group:', newGroupParams);
            const createGroupCmd = new CreateGroupCommand(newGroupParams);
            const response = await cognitoClient.send(createGroupCmd);
            return response.Group;
        } catch (exc) {
            console.log('Error creating group', newGroupParams, exc);
            return {
                GroupName: null,
            };
        }
    });
    const newGroups = (await Promise.all(createGroupPromises)).filter(g => g.GroupName !== null);
    console.log('Created new groups', newGroups);
    return newGroups;
}

async function importUsers(cognitoClient, userPoolId, users) {
    const createUserPromises = await users.map(async u => {
        const newUserParams = {
            UserPoolId: userPoolId,
            Username: u.Username,
            UserAttributes: u.Attributes.filter(attr => attr.Name != 'sub'),
        };
        const newUser = await createUser(cognitoClient, newUserParams);
        if (newUser.Username) {
            console.log(`Add user ${u.Username} to groups:`, u.UserGroups);
            const userGroupsPromises = await u.UserGroups.map(async ug => {
                return await addUserToGroup(cognitoClient, userPoolId, newUser.Username, ug.GroupName);
            });
            await Promise.all(userGroupsPromises);
            return {
                UserGroups: u.UserGroups,
                ...newUser,
            };
        } else {
            return newUser;
        }
    });
    const newUsers = (await Promise.all(createUserPromises)).filter(u => u.Username);
    console.log('Created new users', newUsers);
    return newUsers;
}

async function createUser(cognitoClient, newUserParams) {
    try {
        console.log('Create user', newUserParams);
        const createUserCmd = new AdminCreateUserCommand(newUserParams);    
        const newUserData = await cognitoClient.send(createUserCmd);
        console.log('Created new user:', newUserData);
        return newUserData.User;
    } catch (exc) {
        console.log('Error creating user:', newUserParams, exc);
        return {
            UserName: '',
        };
    }
}

async function addUserToGroup(cognitoClient, userPoolId, userName, groupName) {
    console.log(`Add '${userName}' to '${groupName}' group`);
    const addUserToGroupCmd = new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        GroupName: groupName,
        Username: userName,
    });
    return await cognitoClient.send(addUserToGroupCmd);
}

async function getS3Content(s3Client, Bucket, Key) {
    try {
        console.log(`Getting content from ${Bucket}:${Key}`);
        const getObjectCmd = new GetObjectCommand({
            Bucket,
            Key,
        });
        const response = await s3Client.send(getObjectCmd);
        const responseBody = await response.Body.transformToString();
        return JSON.parse(responseBody);
    } catch (e) {
        console.error(`Error getting content ${Bucket}:${Key}`, e);
        throw e; // rethrow it
    }
}

module.exports = {
    cognitoExport,
    cognitoImport
};

const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");
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

    const cognito = new CognitoIdentityProvider();
    const s3Client = new S3Client();

    await exportData(s3Client, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, USERS_FILENAME),
        backupData: fetchAllUsers(cognito, userPoolId),
    });

    await exportData(s3Client, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, GROUPS_FILENAME),
        backupData: fetchAllGroups(cognito, userPoolId),
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

    const cognito = new CognitoIdentityProvider();
    const s3 = new S3();

    await importGroups(cognito, userPoolId, await getS3Content(s3, backupBucket, createLocation(backupPrefix, GROUPS_FILENAME)));
    await importUsers(cognito, userPoolId, await getS3Content(s3, backupBucket, createLocation(backupPrefix, USERS_FILENAME)));

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

async function* fetchAllUsers(cognito, userPoolId) {
    let cachedUsers = undefined;
    let userIndex = 0;
    const listUserParams = {
        UserPoolId: userPoolId,
    }
    let count = 0;
    while (true) {
        if (cachedUsers === undefined || (userIndex >= cachedUsers.length && listUserParams.PaginationToken)) {
            const { Users = [], PaginationToken } = await cognito.listUsers(listUserParams);
            listUserParams.PaginationToken = PaginationToken;
            cachedUsers = Users;
            userIndex = 0;
        }
        if (userIndex < cachedUsers.length) {
            const nextUser = cachedUsers[userIndex++];
            if (!nextUser.Username) {
                continue;
            }
            nextUser.UserGroups = await fetchUserGroups(cognito, userPoolId, nextUser.Username);
            count++;
            yield nextUser;
        } else if (!listUserParams.PaginationToken) {
            // done
            break;
        }
    }
    console.log(`Fetched ${count} cognito users`);
    return count;
}

async function* fetchAllGroups(cognito, userPoolId) {
    let cachedGroups = undefined;
    let groupIndex = 0;
    const listGroupsParams = {
        UserPoolId: userPoolId,
    }
    let count = 0;
    while (true) {
        if (cachedGroups === undefined || (groupIndex >= cachedGroups.length && listGroupsParams.NextToken)) {
            const { Groups = [], NextToken } = await cognito.listGroups(listGroupsParams);
            listGroupsParams.NextToken = NextToken;
            cachedGroups = Groups;
            groupIndex = 0;
        }
        if (groupIndex < cachedGroups.length) {
            const nextUser = cachedGroups[groupIndex++];
            count++;
            yield nextUser;
        } else if (!listGroupsParams.NextToken) {
            // done
            break;
        }
    }
    console.log(`Fetched ${count} cognito groups`);
    return count;
}

async function fetchUserGroups(cognito, userPoolId, username) {
    console.log(`Fetch user groups for ${username}`);
    const listUserGroupsParams = {
        UserPoolId: userPoolId,
        Username: username
    }
    // This is typically small so I am not using any pagination here
    const { Groups = [] } = await cognito.adminListGroupsForUser(listUserGroupsParams);
    return Groups;
}

function asString(d) {
    return JSON.stringify(d);
};

async function importGroups(cognito, userPoolId, groups) {
    const createGroupPromises = await groups.map(async g => {
        const newGroupParams = {
            UserPoolId: userPoolId,
            GroupName: g.GroupName,
            Description: g.Description,
            Precedence: g.Precedence,
        };
        console.log('Create group:', newGroupParams);
        return await cognito.createGroup(newGroupParams);
    });
    const newGroups = await Promise.all(createGroupPromises);
    console.log('Created new groups', newGroups);
    return newGroups;
}

async function importUsers(cognito, userPoolId, users) {
    const createUserPromises = await users.map(async u => {
        const newUserParams = {
            UserPoolId: userPoolId,
            Username: u.Username,
            UserAttributes: u.Attributes.filter(attr => attr.Name != 'sub'),
        };
        console.log('Create user', newUserParams);
        const newUserData = await cognito.adminCreateUser(newUserParams);
        console.log(`Add user ${u.Username} to groups:`, u.UserGroups);
        const userGroupsPromises = await u.UserGroups.map(async ug => {
            console.log(`Add '${u.Username}' to '${ug.GroupName}' group`);
            return await cognito.adminAddUserToGroup({
                UserPoolId: userPoolId,
                GroupName: ug.GroupName,
                Username: u.Username,
            });
        });
        await Promise.all(userGroupsPromises);
        return {
            UserGroups: u.UserGroups,
            ...newUserData.User,
        };
    });
    const newUsers = await Promise.all(createUserPromises);
    console.log('Created new users', newUsers);
    return newUsers;
}

async function getS3Content(s3, Bucket, Key) {
    try {
        console.log(`Getting content from ${Bucket}:${Key}`);
        const response = await s3.getObject({
            Bucket,
            Key
        });
        return response.Body
            ? JSON.parse(response.Body?.toString())
            : null;
    } catch (e) {
        console.error(`Error getting content ${Bucket}:${Key}`, e);
        throw e; // rethrow it
    }
}

module.exports = {
    cognitoExport,
    cognitoImport
};

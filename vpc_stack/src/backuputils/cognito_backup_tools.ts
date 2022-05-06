import { CognitoIdentityServiceProvider, S3 } from 'aws-sdk';
import { PassThrough, Readable } from 'stream';

type ListUsersRequestType = CognitoIdentityServiceProvider.Types.ListUsersRequest;
type ListGroupsRequestType = CognitoIdentityServiceProvider.Types.ListGroupsRequest;
type ListUserGroupsType = CognitoIdentityServiceProvider.Types.AdminListGroupsForUserRequest;
type UserType = CognitoIdentityServiceProvider.UserType;
type GroupType = CognitoIdentityServiceProvider.GroupType;
type GroupListType = CognitoIdentityServiceProvider.GroupListType;
type S3Body = S3.Types.Body;

interface BackupParameters<T> {
    backupBucket: string;
    backupFile: string;
    backupData: AsyncIterable<T>;
}

interface UserWithGroups extends UserType {
    UserGroups?: GroupListType;
}

export const cognitoExport = async (event: any) : Promise<any> => {

    const { backupBucket, backupPrefix } = event;

    if (!process.env.COGNITO_POOL_ID) {
        throw new Error("The environment does not contain a value for Cognito pool ID");
    }

    const cognito = new CognitoIdentityServiceProvider();
    const s3 = new S3();

    await exportData(s3, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, 'users.json'),
        backupData: fetchAllUsers(cognito, process.env.COGNITO_POOL_ID),
    });

    await exportData(s3, {
        backupBucket: backupBucket,
        backupFile: createLocation(backupPrefix, 'groups.json'),
        backupData: fetchAllGroups(cognito, process.env.COGNITO_POOL_ID),
    });

    return {
        statusCode: 200
    };
}

export const cognitoImport = async (event:any) : Promise<any> => {
    const { cognitoPoolId } = event;

    const cognito = new CognitoIdentityServiceProvider();

    return {
        statusCode: 200
    };
}

const createLocation = (prefix: string, name: string) : string => {
    const location = prefix ? `${prefix}/${name}` : name;
    return location.startsWith('/') ? location.substring(0) : location;
}

async function exportData<T>(s3:S3, backupParams: BackupParameters<T>) {
    const uploadStream = new PassThrough();

    const upload = s3.upload({
        Bucket: backupParams.backupBucket,
        Key: backupParams.backupFile,
        Body: uploadStream,
        ContentType: 'application/json'
    });

    const dataStream = Readable.from(jsonArrayStream(backupParams.backupData));

    dataStream.pipe(uploadStream);
    dataStream.on('end', () => {
        console.log('Finished writing the data stream');
    });

    try {
        await upload.promise();
    } catch (error) {
        throw error;
    }
}

async function* jsonArrayStream<T>(iterableData: AsyncIterable<T>) {
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

async function* fetchAllUsers(cognito: CognitoIdentityServiceProvider, userPoolId: string) {
    let cachedUsers: UserWithGroups[] | undefined = undefined;
    let userIndex: number = 0;
    const listUserParams:ListUsersRequestType = {
        UserPoolId: userPoolId,
        Limit: 5,
    }
    let count = 0;
    while (true) {
        if (cachedUsers === undefined || (userIndex >= cachedUsers.length && listUserParams.PaginationToken)) {
            const { Users = [], PaginationToken } = await cognito.listUsers(listUserParams).promise();
            listUserParams.PaginationToken = PaginationToken;
            cachedUsers = Users;
            console.log('!!!!! Fetch user page', Users);
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

async function* fetchAllGroups(cognito: CognitoIdentityServiceProvider, userPoolId: string) {
    let cachedGroups: GroupType[] | undefined = undefined;
    let groupIndex: number = 0;
    const listGroupsParams:ListGroupsRequestType = {
        UserPoolId: userPoolId,
    }
    let count = 0;
    while (true) {
        if (cachedGroups === undefined || (groupIndex >= cachedGroups.length && listGroupsParams.NextToken)) {
            const { Groups = [], NextToken } = await cognito.listGroups(listGroupsParams).promise();
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

async function fetchUserGroups(cognito: CognitoIdentityServiceProvider, userPoolId:string, username: string) : Promise<GroupListType> {
    console.log(`Fetch user groups for ${username}`);
    const listUserGroupsParams:ListUserGroupsType = {
        UserPoolId: userPoolId,
        Username: username
    }
    // This is typically small so I am not using any pagination here
    const { Groups = [] } = await cognito.adminListGroupsForUser(listUserGroupsParams).promise();
    return Groups;
}

function asString<T>(d:T) : string {
    return JSON.stringify(d);
};

const putS3Content = async (s3:S3, Bucket:string, Key:string, contentType:string, content: S3Body) : Promise<string> => {
    try {
        console.log(`Putting content to ${Bucket}:${Key}`);
        const res = await s3.putObject({
            Bucket,
            Key,
            Body: content,
            ContentType: contentType
        }).promise();
        console.log(`Put content to ${Bucket}:${Key}`, res);
    } catch (e) {
        console.error('Error putting content', `to ${Bucket}:${Key}`, e);
        throw e;
    }
    return `s3://${Bucket}/${Key}`;
};

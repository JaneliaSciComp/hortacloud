import { CognitoIdentityServiceProvider, S3 } from 'aws-sdk';
import { PassThrough, Readable } from 'stream';

type ListUsersRequestTypes = CognitoIdentityServiceProvider.Types.ListUsersRequest;
type UserType = CognitoIdentityServiceProvider.UserType;
type S3Body = S3.Types.Body;

export const cognitoExport = async (event: any) : Promise<any> => {

    const { backupBucket, backupPrefix } = event;

    if (!process.env.COGNITO_POOL_ID) {
        throw new Error("The environment does not contain a value for Cognito pool ID");
    }

    const cognito = new CognitoIdentityServiceProvider();
    const s3 = new S3();

    // const writeStream = new stream.PassThrough();
    const fname = 'users.txt';
    const backupLocation = backupPrefix ? `${backupPrefix}/${fname}` : fname;

    // const JSONStream = require('JSONStream');
    const uploadStream = new PassThrough();

    const upload = s3.upload({
        Bucket: backupBucket,
        Key: backupLocation,
        Body: uploadStream,
        ContentType: 'plain/text'
    });

    const dataStream = Readable.from(new CognitoUsersJSONArrayStream(cognito, process.env.COGNITO_POOL_ID));
    dataStream.pipe(uploadStream);
    dataStream.on('end', () => {
        console.log('Finished writing the data stream');
    });

    // const listUserParams : ListUsersRequestTypes = {
    //     UserPoolId: process.env.COGNITO_POOL_ID
    // }
    // try {
    //     dataStream.push('[');

    //     const paginatedCalls = async (page:number) => {
    //         const { Users = [], PaginationToken } = await cognito.listUsers(listUserParams).promise();

    //         Users.forEach((u, i) => {

    //             if (page == 0 && i == 0) {
    //                 dataStream.push(asString(u));
    //             } else {
    //                 dataStream.push(',');
    //                 dataStream.push(asString(u));
    //             }
    //             // const ustring = asString(u);
    //             // content = `${content}\n${ustring}`;
    //             // console.log('Current user', u);
    //         });
    //         if (PaginationToken) {
    //             // continue if not all user
    //             listUserParams.PaginationToken = PaginationToken;
    //             await paginatedCalls(page + 1);
    //         } else {
    //             dataStream.push(null);
    //         };
    //     };

    //     await paginatedCalls(0);

    //     dataStream.push(']');
    //     console.log('Wait for upload to finish');
    //     await upload.promise();

    // } catch (error) {
    //     throw error;
    // } finally {
    //     // close the stream
    //     dataStream.push(null);
    // }    
    await upload.promise();
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

const asString = (u:UserType) : string => {
    return JSON.stringify(u);
};

class CognitoUsersJSONArrayStream {
    readonly cognito: CognitoIdentityServiceProvider;
    readonly userPoolId: string;
    // cachedUsers: UserType[] | undefined;

    constructor(cognito: CognitoIdentityServiceProvider, userPoolId: string) {
        this.cognito = cognito;
        this.userPoolId = userPoolId;
    }
    
    [Symbol.asyncIterator]() {
        let cachedUsers: UserType[] = [];
        let start = true;
        let end = false;
        let page = 0;
        let userIndex = 0;
        const cognito = this.cognito;
        const listUserParams:ListUsersRequestTypes = {
            UserPoolId: this.userPoolId,
        }
        const retrieveNextUsers = async () => {
            const { Users = [], PaginationToken } = await cognito.listUsers(listUserParams).promise();
            listUserParams.PaginationToken = PaginationToken;
            cachedUsers = Users;
            userIndex = 0;
            page++;
        }
        return {
            async next() {
                if (start) {
                    start = false;
                    // retrieve the first batch
                    await retrieveNextUsers();
                    return {
                        value: '[',
                        done: false
                    }
                }
                if (end) {
                    return {
                        done: true
                    };
                }
                if (userIndex >= cachedUsers.length && listUserParams.PaginationToken) {
                    // if it reached the end of the cachedUsers but AWS told us that we should go back for more
                    await retrieveNextUsers();
                }
                if (userIndex < cachedUsers.length) {
                    const currentUserIndex = userIndex;
                    const nextUser = JSON.stringify(cachedUsers[currentUserIndex]);
                    const value = currentUserIndex > 0 || page > 1
                        ? `,\n${nextUser}`
                        : nextUser;
                    userIndex++;
                    return {
                        value: value,
                        done: false
                    }
                } else {
                    // reached the end, i.e. userIndex is past the end of the buffer and there is no 
                    end = true;
                    return {
                        value: ']',
                        done: false
                    }
                }
            }
        }
    }
}

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

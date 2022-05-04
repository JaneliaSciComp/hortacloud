import { CognitoIdentityServiceProvider } from 'aws-sdk';

type ListUsersRequestTypes = CognitoIdentityServiceProvider.Types.ListUsersRequest;

export const cognitoExport = async (event: any = {}) : Promise <any> => {
    const { cognitoPoolId } = event;

    const cognito = new CognitoIdentityServiceProvider();

    const listUserParams: ListUsersRequestTypes = {
        UserPoolId: cognitoPoolId
    }
    try {
        const paginatedCalls = async () => {
            const { Users = [], PaginationToken } = await cognito.listUsers(listUserParams).promise();

            Users.forEach(u => {
                console.log('Current user', u);
            });
            if (PaginationToken) {
                // continue if not all user
                listUserParams.PaginationToken = PaginationToken;
                await paginatedCalls();
            };
        };

        await paginatedCalls();
    } catch (error) {
        throw error;
    } finally {
        // close the stream
    }    
    return {
        statusCode: 200
    };
}

export const cognitoImport = async (event: any = {}) : Promise <any> => {
    return {
        statusCode: 200
    };
}

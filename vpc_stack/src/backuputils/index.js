const AWS = require('aws-sdk');


exports.cognitoExport = async (event) => {
    const { cognitoPoolId } = event;

    const cognito = new AWS.CognitoIdentityServiceProvider();

    const listUserParams = {
        UserPoolId: cognitoPoolId
    }
    try {
        const paginatedCalls = async () => {
            const { Users=[], PaginationToken } = await cognito.listUsers(listUserParams).promise();

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

exports.cognitoImport = async (event) => {
    return {
        statusCode: 200
    };
}

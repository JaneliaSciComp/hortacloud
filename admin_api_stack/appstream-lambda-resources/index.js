// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require('aws-sdk');
const appstream = new AWS.AppStream;

exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) { //checks to see if Cognito Authorization has been configured
        errorResponse('Authorization has not been configured, please configure an authorizer in API Gateway', context.awsRequestId, callback);
        return;
    }
    const username = event.requestContext.authorizer.claims['cognito:username'];

    var params = {
      FleetName: process.env.FLEETNAME, // 'Workstation9Fleet', /* required */
      StackName: process.env.STACKNAME, // 'JaneliaWorkstation3', /* required */
      UserId: username,
      Validity: 5
    };

    createas2streamingurl(params, context.awsRequestId, callback);
};

function errorResponse(errorMessage, awsRequestId, callback) { //Function for handling error messaging back to client
    callback(null, {
        statusCode: 500,
        body: JSON.stringify({
            Error: errorMessage,
            Reference: awsRequestId,
        }),
        headers: {
            //This should be the domain of the website that originated the request, example: amazonaws.com
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function createas2streamingurl(params, awsRequestId, callback) {
    var request = appstream.createStreamingURL(params);
    request.
        on('success', function (response) {
            console.log("Success. AS2 Streaming URL created.");
            var url = response.data.StreamingURL;
            callback(null, {
                statusCode: 201,
                body: JSON.stringify({
                    Message: url,
                    Reference: awsRequestId,
                }),
                headers: {
                    //This should be the domain of the website that originated the request, example: amazonaws.com
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }).
        on('error', function (response) {
            console.log("Error: " + JSON.stringify(response.message));
            errorResponse('Error creating AS2 streaming URL: ' + JSON.stringify(response.message), awsRequestId, callback);

        }).
        send();
}

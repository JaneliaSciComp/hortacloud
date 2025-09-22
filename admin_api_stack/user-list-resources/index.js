/* eslint-disable */
/*
 * Copyright 2019-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app');
const handlePostConfirmation = require('./postConfirmationHandler');
const handleCustomMessage = require('./customMessageHandler'); // 👈 new handler

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  switch (event.triggerSource) {
    case "PostConfirmation_ConfirmSignUp":
      return handlePostConfirmation(event);

    case "CustomMessage_SignUp": // 👈 signup confirmation emails
    case "CustomMessage_ForgotPassword": // 👈 forgot password emails
    case "CustomMessage_ResendCode": // 👈 resend signup code
      return handleCustomMessage(event);

    default:
      // Fall back to Express app
      return awsServerlessExpress.proxy(server, event, context);
  }
};


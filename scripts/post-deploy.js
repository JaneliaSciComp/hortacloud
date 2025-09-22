#!/usr/bin/env node

const dotenv = require("dotenv");
const AWS = require("aws-sdk");

dotenv.config();

const { HORTA_ORG, HORTA_STAGE, AWS_REGION } = process.env;
const COGNITO_STACK = `${HORTA_ORG}-hc-cognito-${HORTA_STAGE}`;
const lambdaPrefix = `${HORTA_ORG}-hc-adminAPI-${HORTA_STAGE}-LambdasHortaCloudUserLis`;

(async () => {
  const cloudformation = new AWS.CloudFormation({ region: AWS_REGION });
  const lambda = new AWS.Lambda({ region: AWS_REGION });
  const cognito = new AWS.CognitoIdentityServiceProvider({ region: AWS_REGION });
  const sts = new AWS.STS({ region: AWS_REGION });

  // 🔹 Lookup accountId dynamically
  const { Account: accountId } = await sts.getCallerIdentity().promise();

  // 🔹 Get the User Pool ID from the Cognito stack
  const cogStack = await cloudformation.describeStacks({ StackName: COGNITO_STACK }).promise();
  const outputs = {};
  cogStack.Stacks[0].Outputs.forEach(o => (outputs[o.OutputKey] = o.OutputValue));
  const userPoolId = outputs.UserPoolId;
  if (!userPoolId) throw new Error(`UserPoolId not found in stack ${COGNITO_STACK}`);

  // 🔹 Retrieve all Lambda functions (paged)
  let functions = [];
  let marker;
  do {
    const resp = await lambda.listFunctions({ Marker: marker }).promise();
    functions = functions.concat(resp.Functions);
    marker = resp.NextMarker;
  } while (marker);

  // 🔹 Find the target Lambda by prefix
  const targetLambda = functions.find(fn => fn.FunctionName.startsWith(lambdaPrefix));
  if (!targetLambda) throw new Error(`Lambda with prefix ${lambdaPrefix} not found`);

  // 🔹 Get current pool config
  const poolDesc = await cognito.describeUserPool({ UserPoolId: userPoolId }).promise();
  const currentConfig = poolDesc.UserPool;

  // 🔹 Preserve existing LambdaConfig
  const existingLambdaConfig = currentConfig.LambdaConfig || {};

  // 🔹 Add/replace just the PostConfirmation hook
  await cognito.updateUserPool({
    UserPoolId: userPoolId,
    LambdaConfig: {
            PostConfirmation: targetLambda.FunctionArn,
            CustomMessage: targetLambda.FunctionArn // 👈 same Lambda handles both
    },
    AutoVerifiedAttributes: ["email"], // enable email auto-verification
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        { Name: "verified_email", Priority: 1 }
      ]
    },
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: false, // self-service signup allowed
      InviteMessageTemplate: {
        EmailSubject: "Welcome to the HortaCloud Demo",
        EmailMessage: "Hello {username}, your temporary password is {####}"
     }
    },
  VerificationMessageTemplate: {
    EmailSubject: "Confirm your HortaCloud demo account",
    EmailMessage: `Hello {username},<br/><br/>
      Thank you for signing up for a HortaCloud demo account.<br/>
      Your confirmation code is: <b>{####}</b><br/><br/>
      Please enter this code in the sign-up page to complete your registration.<br/><br/>
      – The HortaCloud Team`,
    DefaultEmailOption: "CONFIRM_WITH_CODE"
  }
  }).promise();

  console.log(`✅ Attached PostConfirmation Lambda (${targetLambda.FunctionName}) to User Pool: ${userPoolId}`);

  // 🔹 Ensure Cognito can invoke the Lambda
  try {
    await lambda.addPermission({
      FunctionName: targetLambda.FunctionName,
      Action: "lambda:InvokeFunction",
      Principal: "cognito-idp.amazonaws.com",
      SourceArn: `arn:aws:cognito-idp:${AWS_REGION}:${accountId}:userpool/${userPoolId}`,
      StatementId: `CognitoInvoke-${Date.now()}`
    }).promise();

    console.log(`✅ Granted Cognito permission to invoke ${targetLambda.FunctionName}`);
  } catch (err) {
    if (err.code === "ResourceConflictException") {
      console.log("ℹ️ Permission already exists, skipping.");
    } else {
      throw err;
    }
  }
})();


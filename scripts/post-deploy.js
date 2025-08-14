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

  // Get the User Pool ID from the Cognito stack
  const cogStack = await cloudformation.describeStacks({ StackName: COGNITO_STACK }).promise();
  const outputs = {};
  cogStack.Stacks[0].Outputs.forEach(o => (outputs[o.OutputKey] = o.OutputValue));
  const userPoolId = outputs.UserPoolId;
  if (!userPoolId) throw new Error(`UserPoolId not found in stack ${COGNITO_STACK}`);

  // Retrieve all Lambda functions (paged)
  let functions = [];
  let marker;
  do {
    const resp = await lambda.listFunctions({ Marker: marker }).promise();
    functions = functions.concat(resp.Functions);
    marker = resp.NextMarker;
  } while (marker);

  // Find the target Lambda by prefix
  const targetLambda = functions.find(fn => fn.FunctionName.startsWith(lambdaPrefix));
  if (!targetLambda) throw new Error(`Lambda with prefix ${lambdaPrefix} not found`);

  // Attach Lambda to Cognito PostConfirmation trigger
  await cognito.updateUserPool({
    UserPoolId: userPoolId,
    LambdaConfig: { PostConfirmation: targetLambda.FunctionArn }
  }).promise();

  console.log(`✅ Attached PostConfirmation Lambda (${targetLambda.FunctionName}) to User Pool: ${userPoolId}`);
})();


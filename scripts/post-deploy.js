#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const child_process = require("child_process");
const os = require("os");
const AWS = require('aws-sdk');

// Make sure region is set before using AWS services
AWS.config.update({ region: process.env.AWS_REGION });

async function createZip() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "postconfirmation-"));
  const lambdaCode = `
    const axios = require("axios");
    exports.handler = async (event) => {
      console.log("PostConfirmation:", JSON.stringify(event));
      try {
        await axios.post(process.env.API_ENDPOINT + "/internal/addUser", {
          username: event.userName,
          email: event.request.userAttributes.email
        });
      } catch (err) {
        console.error("Error calling API:", err);
      }
      return event;
    };
  `;
  fs.writeFileSync(path.join(tmpDir, "index.js"), lambdaCode);

  // Install axios
  child_process.execSync("npm init -y", { cwd: tmpDir, stdio: "inherit" });
  child_process.execSync("npm install axios", { cwd: tmpDir, stdio: "inherit" });

  // Zip the folder
  const zipPath = path.join(os.tmpdir(), "lambda.zip");
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(tmpDir, false);
    archive.finalize();
  });

  return fs.readFileSync(zipPath);
}


const {
  CloudFormation,
  Lambda,
  IAM
} = require("aws-sdk");
const axios = require("axios");
const aws4 = require("aws4");

// 🔹 Environment variables to configure
dotenv.config();

const { HORTA_ORG, HORTA_STAGE, ADMIN_USER_EMAIL, AWS_REGION } = process.env;
const ADMIN_API_STACK = `${HORTA_ORG}-hc-adminAPI-${HORTA_STAGE}`;
const COGNITO_STACK = `${HORTA_ORG}-hc-cognito-${HORTA_STAGE}`;
const POST_CONFIRMATION_NAME = process.env.POST_CONFIRMATION_NAME || "PostConfirmationLambda";
const TEST_USERNAME = process.env.TEST_USERNAME || "newuser@example.com";
const TEST_GROUP = process.env.TEST_GROUP || "admins";

if (!ADMIN_API_STACK || !COGNITO_STACK) {
  console.error("❌ Missing required env vars: ADMIN_API_STACK and COGNITO_STACK");
  process.exit(1);
}

(async () => {
  const cloudformation = new CloudFormation({ region: AWS_REGION });
  const lambda = new Lambda({ region: AWS_REGION });
  const iam = new IAM({ region: AWS_REGION });

  // 1️⃣ Get Admin API Gateway info
// 1️⃣ Get API Gateway endpoint from stack outputs
const apiStack = await cloudformation
  .describeStacks({ StackName: ADMIN_API_STACK })
  .promise();

const outputs = {};
apiStack.Stacks[0].Outputs.forEach(o => {
  outputs[o.OutputKey] = o.OutputValue;
});
const apiEndpoint = outputs.ApiGatewayEndPoint;
if (!apiEndpoint) {
  throw new Error(`Could not find ApiGatewayEndPoint output in stack ${ADMIN_API_STACK}`);
}

console.log(`✅ Found API endpoint: ${apiEndpoint}`);

// 2️⃣ Create PostConfirmation Lambda (if missing)
const lambdaName = `${HORTA_ORG}-PostConfirmation-${HORTA_STAGE}`;
try {
  await lambda.getFunction({ FunctionName: lambdaName }).promise();
  console.log(`ℹ️ PostConfirmation Lambda already exists: ${lambdaName}`);
} catch (err) {
  if (err.code === "ResourceNotFoundException") {
    console.log(`🚀 Creating PostConfirmation Lambda: ${lambdaName}`);

    // Create IAM role for Lambda
    const roleName = `${HORTA_ORG}-PostConfirmationRole-${HORTA_STAGE}`;
    const assumeRolePolicy = {
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { Service: "lambda.amazonaws.com" },
        Action: "sts:AssumeRole"
      }]
    };

    let roleArn;
    try {
      const roleRes = await iam.createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy)
      }).promise();
      roleArn = roleRes.Role.Arn;

      // Attach policies for CloudWatch Logs + execute API
      await iam.attachRolePolicy({
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      }).promise();
      await iam.attachRolePolicy({
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess"
      }).promise();

      console.log(`✅ Created role: ${roleName}`);
    } catch (roleErr) {
      if (roleErr.code === "EntityAlreadyExists") {
        const existingRole = await iam.getRole({ RoleName: roleName }).promise();
        roleArn = existingRole.Role.Arn;
        console.log(`ℹ️ Using existing role: ${roleName}`);
      } else {
        throw roleErr;
      }
    }

    // Lambda function code
    const lambdaCode = `
      const https = require("https");
      const AWS = require("aws-sdk");
      const aws4 = require("aws4");

      exports.handler = async (event) => {
        console.log("PostConfirmation event:", JSON.stringify(event));
        const email = event.request.userAttributes.email;
        const endpoint = process.env.API_ENDPOINT;
        const region = AWS_REGION;

        const opts = {
          host: endpoint.replace(/^https:\\/\\//, "").split("/")[0],
          path: "/internal/addUser",
          method: "POST",
          service: "execute-api",
          region,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email, groupname: "admins" })
        };
        aws4.sign(opts);

        await new Promise((resolve, reject) => {
          const req = https.request(opts, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
              console.log("Response:", res.statusCode, data);
              resolve();
            });
          });
          req.on("error", reject);
          req.write(opts.body);
          req.end();
        });

        return event;
      };
    `;

    // Create the Lambda
    const createResp = await lambda.createFunction({
      FunctionName: lambdaName,
      Role: roleArn,
      Handler: "index.handler",
      Runtime: "nodejs18.x",
      Environment: {
  Variables: {
    API_ENDPOINT: apiEndpoint, // ✅ only custom vars
  }
},
	Code: { ZipFile: await createZip() }
    }).promise();

    console.log(`✅ Created Lambda: ${lambdaName}`);

// Grab ARN from the create response
const lambdaArn = createResp.FunctionArn;

// After Lambda creation
const cognito = new AWS.CognitoIdentityServiceProvider({ region: AWS_REGION });

// Get the UserPoolId from the stack outputs
const cogStack = await cloudformation
  .describeStacks({ StackName: COGNITO_STACK })
  .promise();

const userPoolIdOutput = cogStack.Stacks[0].Outputs.find(o => o.OutputKey === "UserPoolId");
if (!userPoolIdOutput) {
  throw new Error(`Could not find UserPoolId output in stack ${COGNITO_STACK}`);
}
const userPoolId = userPoolIdOutput.OutputValue;

// Attach the Lambda as PostConfirmation
await cognito.updateUserPool({
  UserPoolId: userPoolId,
  LambdaConfig: {
    PostConfirmation: lambdaArn // ARN from createFunction or getFunctionConfiguration
  }
}).promise();

console.log(`✅ Attached ${lambdaName} to PostConfirmation trigger for ${userPoolId}`);
 } else {
    throw err;
  }
}



})();


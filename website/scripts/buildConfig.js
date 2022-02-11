const fs = require("fs");
const path = require("path");
const { CloudFormation } = require("aws-sdk");

// set defaults for the org and stage.
const { HORTA_ORG = "janelia", HORTA_STAGE = "dev" } = process.env;

const region = process.env.AWS_REGION;
const cloudformation = new CloudFormation({ region });

async function main() {
  const outputs = {};

  // get stack info
  const apiStack = await cloudformation
    .describeStacks({
      StackName: `${HORTA_ORG}-HortaCloudAdminAPIStack-${HORTA_STAGE}`,
    })
    .promise();

  // build the outputs into a simple object
  apiStack.Stacks[0].Outputs.forEach(({ OutputKey, OutputValue }) => {
    outputs[OutputKey] = OutputValue;
  });

  // read existing config or create a new one
  const configFilePath = path.join(__dirname, "..", "src", "config.json");
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configFilePath));
  } catch (error) {
    // If the file is missing, then don't worry, because we will
    // create it later.
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  // build config:
  config.cognito = {
    region,
    userPoolId: outputs.UserPoolId,
    userPoolClientId: outputs.UserPoolClientId,
  };
  config.api = {
    endpoint: outputs.ApiGatewayEndPoint,
  };

  // update the file
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}
main();

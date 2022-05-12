const fs = require("fs");
const path = require("path");
const { CloudFormation } = require("aws-sdk");

// set defaults for the org and stage.
const { HORTA_ORG = "janelia", HORTA_STAGE = "dev" } = process.env;

const region = process.env.AWS_REGION;
const cloudformation = new CloudFormation({ region });

async function main() {

  // dump stack outputs
  const outputs = await dumpCFStacksOutputs(['cognito', 'adminAPI']);

  console.log('Stacks outputs', outputs);

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

async function dumpCFStacksOutputs(stackNames) {

  const outputs = {};

  const stackPromises = await stackNames.map(async stackName => {
    return await cloudformation
      .describeStacks({
        StackName: `${HORTA_ORG}-hc-${stackName}-${HORTA_STAGE}`,
      })
      .promise();
  });

  const stacks = await Promise.all(stackPromises);

  stacks.forEach(stack => {
    // dump the outputs into a simple object
    stack.Stacks[0].Outputs.forEach(({ OutputKey, OutputValue }) => {
      outputs[OutputKey] = OutputValue;
    });
  });

  return outputs;
}

main();

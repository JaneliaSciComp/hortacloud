import { App, Stack, Tags } from "aws-cdk-lib";
import { HortaCloudServicesStack } from "./hortacloud-services";
import { HortaCloudVPC } from "./hortacloud-vpc";
import {
  getHortaCloudConfig,
  createResourceId
} from "../../common/hortacloud-common";

const { AWS_REGION, AWS_ACCOUNT } = process.env;

const hortaConfig = getHortaCloudConfig();

const app = new App();


const vpc = new HortaCloudVPC(app, "VPC", {
  stackName: createResourceId(hortaConfig, "vpc")
});

const servicesStack = new HortaCloudServicesStack(app, "Services", {
  env: {
    account: AWS_ACCOUNT,
    region: AWS_REGION
  },
  stackName: createResourceId(hortaConfig, "services"),
  vpc: vpc.vpc
});

applyTags([servicesStack, vpc]);

function applyTags(stacks: Stack[]) {
  stacks.forEach(s => {
    Tags.of(s).add("PROJECT", "MouseLight");
    Tags.of(s).add("DEVELOPER", hortaConfig.developerName);
    Tags.of(s).add("STAGE", hortaConfig.hortaStage);
    Tags.of(s).add("VERSION", hortaConfig.hortaCloudVersion);
  });
}

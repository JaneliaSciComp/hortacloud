#!/usr/bin/env node

import { App, Fn, Stack, Tags } from "aws-cdk-lib";
import {
  getHortaCloudConfig,
  createResourceId,
  HortaCloudConfig
} from "../../common/hortacloud-common";
import { HortaCloudCognitoStack } from "./hortacloud-cognito";

const hortaConfig = getHortaCloudConfig();

const app = new App();

const { AWS_REGION, AWS_ACCOUNT } = process.env;

const cognitoStack = new HortaCloudCognitoStack(app, "Workstation", {
  env: {
    account: AWS_ACCOUNT,
    region: AWS_REGION
  },
  stackName: createResourceId(hortaConfig, "cognito"),
});

applyTags([cognitoStack]);

function applyTags(stacks: Stack[]) {
  stacks.forEach(s => {
    Tags.of(s).add("PROJECT", "MouseLight");
    Tags.of(s).add("DEVELOPER", hortaConfig.developerName);
    Tags.of(s).add("STAGE", hortaConfig.hortaStage);
    Tags.of(s).add("VERSION", hortaConfig.hortaCloudVersion);
  });
}

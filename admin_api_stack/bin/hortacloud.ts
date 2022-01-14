#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HortaCloudAdminAPIStack } from "../lib/adminapi-stack";
import { HortaCloudWebAppStack } from "../lib/frontend-stack";

const app = new cdk.App();
const deploy = app.node.tryGetContext("deploy");

if (deploy === "backend") {
  console.log("- Web API Stack");
  const backendStack = new HortaCloudAdminAPIStack(
    app,
    "HortaCloudAdminAPIStack",
    {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
      }
    }
  );

  cdk.Tags.of(backendStack).add("PROJECT", "MouseLight");
  cdk.Tags.of(backendStack).add("DEVELOPER", process.env.USER || "unknown");
  cdk.Tags.of(backendStack).add("STAGE", "dev");
  cdk.Tags.of(backendStack).add("VERSION", "0.0.1");
} else if (deploy === "frontend") {
  console.log("- Web Admin Stack");
  const frontendStack = new HortaCloudWebAppStack(app, "HortaCloudWebAppStack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    }
  });

  cdk.Tags.of(frontendStack).add("PROJECT", "MouseLight");
  cdk.Tags.of(frontendStack).add("DEVELOPER", process.env.USER || "unknown");
  cdk.Tags.of(frontendStack).add("STAGE", "dev");
  cdk.Tags.of(frontendStack).add("VERSION", "0.0.1");
} else {
  console.error("deploy context of either 'backend' or 'frontend' must be specified");
}

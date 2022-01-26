#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HortaCloudAdminAPIStack } from "../lib/adminapi-stack";
import { HortaCloudWebAppStack } from "../lib/frontend-stack";

const app = new cdk.App();
const deploy = app.node.tryGetContext("deploy");

// set defaults for the org and stage.
const {
  HORTA_ORG = "janelia",
  HORTA_STAGE = "dev",
  CDK_DEFAULT_ACCOUNT,
  CDK_DEFAULT_REGION
} = process.env;

if (deploy === "admin_api") {
  const backendStack = new HortaCloudAdminAPIStack(
    app,
    `${HORTA_ORG}-HortaCloudAdminAPIStack-${HORTA_STAGE}`,
    {
      env: {
        account: CDK_DEFAULT_ACCOUNT,
        region: CDK_DEFAULT_REGION
      },
      stage: HORTA_STAGE,
      org: HORTA_ORG
    }
  );

  cdk.Tags.of(backendStack).add("PROJECT", "MouseLight");
  cdk.Tags.of(backendStack).add("DEVELOPER", process.env.USER || "unknown");
  cdk.Tags.of(backendStack).add("STAGE", "dev");
  cdk.Tags.of(backendStack).add("VERSION", "0.0.1");
} else if (deploy === "admin_website") {
  const frontendStack = new HortaCloudWebAppStack(
    app,
    `${HORTA_ORG}-HortaCloudWebAppStack-${HORTA_STAGE}`,
    {
      env: {
        account: CDK_DEFAULT_ACCOUNT,
        region: CDK_DEFAULT_REGION
      },
      stage: HORTA_STAGE,
      org: HORTA_ORG
    }
  );

  cdk.Tags.of(frontendStack).add("PROJECT", "MouseLight");
  cdk.Tags.of(frontendStack).add("DEVELOPER", process.env.USER || "unknown");
  cdk.Tags.of(frontendStack).add("STAGE", "dev");
  cdk.Tags.of(frontendStack).add("VERSION", "0.0.1");
} else {
  console.error(
    "deploy context of either 'admin_api' or 'admin_website' must be specified"
  );
}

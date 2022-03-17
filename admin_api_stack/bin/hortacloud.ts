#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HortaCloudAdminAPIStack } from "../lib/adminapi-stack";
import { HortaCloudWebAppStack } from "../lib/frontend-stack";
import { getHortaCloudConfig, createResourceId } from "../../common/hortacloud-common";

const app = new cdk.App();
const deploy = app.node.tryGetContext("deploy");

// set defaults for the org and stage.
const {
  AWS_REGION,
  AWS_ACCOUNT
} = process.env;

const cfg = getHortaCloudConfig();

if (deploy === "admin_api") {
  const backendStack = new HortaCloudAdminAPIStack(
    app,
    createResourceId(cfg, 'adminAPI'),
    {
      env: {
        account: AWS_ACCOUNT,
        region: AWS_REGION
      },
      stage: cfg.hortaStage,
      org: cfg.hortaCloudOrg,
      description:
        "HortaCloud Admin API stack hosting the cognito pool and lambdas"
    }
  );

  cdk.Tags.of(backendStack).add("PROJECT", "MouseLight");
  cdk.Tags.of(backendStack).add("DEVELOPER", process.env.USER || "unknown");
  cdk.Tags.of(backendStack).add("STAGE", "dev");
  cdk.Tags.of(backendStack).add("VERSION", "0.0.1");
} else if (deploy === "admin_website") {
  const frontendStack = new HortaCloudWebAppStack(
    app,
    createResourceId(cfg, 'adminWebApp'),
    {
      env: {
        account: AWS_ACCOUNT,
        region: AWS_REGION
      },
      stage: cfg.hortaStage,
      org: cfg.hortaCloudOrg,
      description: "HortaCloud Web Admin stack hosting the admin website"
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

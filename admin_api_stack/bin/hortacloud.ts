#!/usr/bin/env node

import "source-map-support/register";

import { App, Fn, Tags } from "aws-cdk-lib";
import { HortaCloudAdminAPIStack } from "../lib/adminapi-stack";
import { HortaCloudWebAppStack } from "../lib/frontend-stack";
import {
  getHortaCloudConfig,
  createResourceId,
  HortaCloudConfig,
} from "../../common/hortacloud-common";

const app = new App();

const deploy = app.node.tryGetContext("deploy");

// set defaults for the org and stage.
const { AWS_REGION, AWS_ACCOUNT } = process.env;

const cfg = getHortaCloudConfig();

if (deploy === "admin_api") {
  const backendStack = new HortaCloudAdminAPIStack(
    app,
    createResourceId(cfg, "adminAPI"),
    {
      env: {
        account: AWS_ACCOUNT,
        region: AWS_REGION,
      },
      stage: cfg.hortaStage,
      org: cfg.hortaCloudOrg,
      description:
        "HortaCloud Admin API stack hosting the cognito pool and lambdas",
      userPoolId: getCognitoPoolId(cfg),
    }
  );

  Tags.of(backendStack).add("PROJECT", "MouseLight");
  Tags.of(backendStack).add("DEVELOPER", process.env.USER || "unknown");
  Tags.of(backendStack).add("STAGE", "dev");
  Tags.of(backendStack).add("VERSION", "0.0.1");
} else if (deploy === "admin_website") {
  const frontendStack = new HortaCloudWebAppStack(
    app,
    createResourceId(cfg, "adminWebApp"),
    {
      env: {
        account: AWS_ACCOUNT,
        region: AWS_REGION,
      },
      stage: cfg.hortaStage,
      org: cfg.hortaCloudOrg,
      description: "HortaCloud Web Admin stack hosting the admin website",
    }
  );

  Tags.of(frontendStack).add("PROJECT", "MouseLight");
  Tags.of(frontendStack).add("DEVELOPER", process.env.USER || "unknown");
  Tags.of(frontendStack).add("STAGE", "dev");
  Tags.of(frontendStack).add("VERSION", "0.0.1");
} else {
  console.error(
    "deploy context of either 'admin_api' or 'admin_website' must be specified"
  );
}

function getCognitoPoolId(hortaConfig: HortaCloudConfig): string {
  return Fn.importValue(createResourceId(hortaConfig, "UserPoolId"));
}

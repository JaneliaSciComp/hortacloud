#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { HortaCloudStack } from '../lib/hortacloud-stack';
import { App, Stack, Tags } from '@aws-cdk/core';

// TODO: add a way to do non-dev deployments using STAGE env var
const stack_id = `janelia-hortacloud-${process.env.USER}`

const app = new cdk.App();
const stack = new HortaCloudStack(app, stack_id, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

Tags.of(stack).add('PROJECT', 'MouseLight');
Tags.of(stack).add('DEVELOPER', process.env.USER || "unknown");
Tags.of(stack).add('STAGE', 'dev');
Tags.of(stack).add('VERSION', '0.0.1');

#!/usr/bin/env node

import { App, Fn, Stack, Tags } from 'aws-cdk-lib';
import { HortaCloudWorkstationStack } from './hortacloud-workstation-cfstack';
import {
  getHortaCloudConfig,
  createResourceId,
  HortaCloudConfig,
  VpcInstanceProps
} from '../../common/hortacloud-common';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const { AWS_REGION, AWS_ACCOUNT } = process.env;

const workstationStack = new HortaCloudWorkstationStack(app, 'Workstation', {
  env: {
    account: AWS_ACCOUNT,
    region: AWS_REGION
  },
  stackName: createResourceId(hortaConfig, 'workstation'),
  ...importVPCProps(hortaConfig)
});

applyTags([workstationStack]);

function applyTags(stacks: Stack[]) {
  stacks.forEach(s => {
    Tags.of(s).add('PROJECT', 'MouseLight');
    Tags.of(s).add('DEVELOPER', hortaConfig.developerName);
    Tags.of(s).add('STAGE', hortaConfig.hortaStage);
    Tags.of(s).add('VERSION', hortaConfig.hortaCloudVersion);
  });
}

function importVPCProps(hortaConfig: HortaCloudConfig): VpcInstanceProps {
  return {
    vpcId: Fn.importValue(createResourceId(hortaConfig, 'VpcID')),
    privateSubnetIds: [
      Fn.importValue(createResourceId(hortaConfig, 'PrivateSubnetID'))
    ],
    publicSubnetIds: [
      Fn.importValue(createResourceId(hortaConfig, 'PublicSubnetID'))
    ]
  };
}

#!/usr/bin/env node

import { App, Fn, Lazy, Stack, Tags, Token } from 'aws-cdk-lib';
import { HortaCloudWorkstationStack } from "./hortacloud-workstation";
import { getHortaCloudConfig, createResourceId } from '../../common/hortacloud-common';
import { getVPCProps } from './hortacloud-vpcprops';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const vpcProps = getVPCProps(hortaConfig);

const workstationStack = new HortaCloudWorkstationStack(
    app,
    'Workstation',
    {
        stackName: createResourceId(hortaConfig, 'workstation'),
        ...vpcProps
    }
);

applyTags([workstationStack]);

function applyTags(stacks: Stack[]) {
    stacks.forEach(s => {
        Tags.of(s).add('PROJECT', 'MouseLight');
        Tags.of(s).add('DEVELOPER', hortaConfig.developerName);
        Tags.of(s).add('STAGE', hortaConfig.hortaStage);
        Tags.of(s).add('VERSION', hortaConfig.hortaCloudVersion);
    })
}

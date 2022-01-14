#!/usr/bin/env node

import { App, Stack, Tags } from 'aws-cdk-lib';
import { HortaCloudServicesStack } from './hortacloud-services';
import { getHortaCloudConfig, createResourceId } from './hortacloud-config';
import { HortaCloudVPC } from './hortacloud-vpc';
import { HortaCloudWorkstationStack } from './hortacloud-workstation';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const vpc = new HortaCloudVPC(app, createResourceId(hortaConfig, 'vpc'));

const servicesStack = new HortaCloudServicesStack(app, createResourceId(hortaConfig, 'services'), vpc);
const workstationStack = new HortaCloudWorkstationStack(app, createResourceId(hortaConfig, 'workstation'), vpc);

applyTags([servicesStack, workstationStack]);

function applyTags(stacks: Stack[]) {
    stacks.forEach(s => {
        Tags.of(s).add('PROJECT', 'MouseLight');
        Tags.of(s).add('DEVELOPER', hortaConfig.developerName);
        Tags.of(s).add('STAGE', hortaConfig.hortaStage);
        Tags.of(s).add('VERSION', hortaConfig.hortaCloudVersion);
    })
}

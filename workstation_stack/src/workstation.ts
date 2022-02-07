#!/usr/bin/env node

import { App, Stack, Tags } from 'aws-cdk-lib';
import {HortaCloudWorkstationStack} from "./hortacloud-workstation";
import { getHortaCloudConfig, createResourceId } from '../../common/hortacloud-common';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const workstationStack = new HortaCloudWorkstationStack(app, createResourceId(hortaConfig, 'workstation'));

applyTags([workstationStack]);

function applyTags(stacks: Stack[]) {
    stacks.forEach(s => {
        Tags.of(s).add('PROJECT', 'MouseLight');
        Tags.of(s).add('DEVELOPER', hortaConfig.developerName);
        Tags.of(s).add('STAGE', hortaConfig.hortaStage);
        Tags.of(s).add('VERSION', hortaConfig.hortaCloudVersion);
    })
}

#!/usr/bin/env node

import { App, Fn, Lazy, Stack, Tags, Token } from 'aws-cdk-lib';
import { HortaCloudWorkstationStack } from "./hortacloud-workstation";
import { getHortaCloudConfig, createResourceId } from '../../common/hortacloud-common';
import { getVPC } from './hortacloud-vpc';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const hortaVPCIDKey = createResourceId(hortaConfig, 'VpcID');
const vpcId = Fn.importValue(hortaVPCIDKey);
const vpcProps = {
    vpcId: vpcId,
    privateSubnetId: Fn.importValue(createResourceId(hortaConfig, 'PrivateSubnetID')),
    publicSubnetId: Fn.importValue(createResourceId(hortaConfig, 'PublicSubnetID'))
};

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

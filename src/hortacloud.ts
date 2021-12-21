#!/usr/bin/env node

import { App, Tags } from 'aws-cdk-lib';
import { HortaCloudServicesStack } from './hortacloud-services';
import { getHortaConfig } from './hortacloud-config';

const hortaConfig = getHortaConfig();

const stackId = `${hortaConfig.hortaCloudOrg}-hortacloud-${hortaConfig.hortaStage}`;

const app = new App();

const servicesStack = new HortaCloudServicesStack(app, stackId, {
});

Tags.of(servicesStack).add('PROJECT', 'MouseLight');
Tags.of(servicesStack).add('DEVELOPER', hortaConfig.developerName);
Tags.of(servicesStack).add('STAGE', hortaConfig.hortaStage);
Tags.of(servicesStack).add('VERSION', hortaConfig.hortaCloudVersion);

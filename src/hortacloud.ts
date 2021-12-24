#!/usr/bin/env node

import { App, Tags } from 'aws-cdk-lib';
import { HortaCloudServicesStack } from './hortacloud-services';
import { getHortaCloudConfig, createResourceId } from './hortacloud-config';
import { HortaCloudVPC } from './hortacloud-vpc';

const hortaConfig = getHortaCloudConfig();

const app = new App();

const vpc = new HortaCloudVPC(app, createResourceId(hortaConfig, 'vpc'));

const servicesStack = new HortaCloudServicesStack(app, createResourceId(hortaConfig, 'services'), vpc);

Tags.of(servicesStack).add('PROJECT', 'MouseLight');
Tags.of(servicesStack).add('DEVELOPER', hortaConfig.developerName);
Tags.of(servicesStack).add('STAGE', hortaConfig.hortaStage);
Tags.of(servicesStack).add('VERSION', hortaConfig.hortaCloudVersion);

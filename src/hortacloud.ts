#!/usr/bin/env node

import { App, Tags } from 'aws-cdk-lib';
import { HortaCloudServicesStack } from './hortacloud-services';

const stage = process.env.HORTA_STAGE ? process.env.HORTA_STAGE : 'cgdev';
const stack_id = `janelia-hortacloud-${stage}`;
const version = '1.0.0';

const app = new App();

const servicesStack = new HortaCloudServicesStack(app, stack_id);

Tags.of(servicesStack).add('PROJECT', 'MouseLight');
Tags.of(servicesStack).add('DEVELOPER', process.env.USER || "unknown");
Tags.of(servicesStack).add('STAGE', stage);
Tags.of(servicesStack).add('VERSION', version);

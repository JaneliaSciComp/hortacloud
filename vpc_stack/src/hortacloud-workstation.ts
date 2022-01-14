import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudVPC } from './hortacloud-vpc';

export class HortaCloudWorkstationStack extends Stack {

  constructor(scope: Construct,
              id: string,
              hortaVpc: HortaCloudVPC,
              props?: StackProps) {
    super(scope, id, props);
  }
}

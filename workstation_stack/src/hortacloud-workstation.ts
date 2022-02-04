import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudVPC } from '../../vpc_stack/src/hortacloud-vpc';
import { HortacloudAppstream } from './hortacloud-appstream';

export class HortaCloudWorkstationStack extends Stack {

  public readonly server: HortacloudAppstream;

  constructor(scope: Construct,
              id: string,
              props?: StackProps) {
    super(scope, id, props);

    this.server = new HortacloudAppstream(this, 'Workstation');
  }
}
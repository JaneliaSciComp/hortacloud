import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudVPC } from './hortacloud-vpc';
import { HortaCloudAppstream } from './hortacloud-appstream';

export class HortaCloudWorkstationStack extends Stack {

  public readonly server: HortaCloudAppstream;

  constructor(scope: Construct,
              id: string,
              hortaVpc: HortaCloudVPC,
              props?: StackProps) {
    super(scope, id, props);

    this.server = new HortaCloudAppstream(this, 'Workstation', hortaVpc);
  }
}

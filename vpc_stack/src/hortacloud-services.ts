import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudJACS } from './hortacloud-jacs';
import { HortaCloudVPC } from './hortacloud-vpc';

export class HortaCloudServicesStack extends Stack {

  public readonly server: HortaCloudJACS;

  constructor(scope: Construct, 
              id: string,
              hortaVpc: HortaCloudVPC,
              props?: StackProps) {
    super(scope, id, props);

    this.server = new HortaCloudJACS(this, 'JACS', hortaVpc);
  }
}

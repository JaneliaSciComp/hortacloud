import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { HortaCloudVPC } from './hortacloud-vpc';

export class HortaCloudAppstream extends Construct {

  public readonly server: ec2.Instance;

  constructor(scope: Construct,
              id: string,
              hortaVpc: HortaCloudVPC) {
    super(scope, id);
  }
}

import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

import { HortacloudAppstream } from './hortacloud-appstream';
import { getVPC, VpcInstanceProps } from './hortacloud-vpc';

interface WorkstationStackProps extends StackProps, VpcInstanceProps {
  
}

export class HortaCloudWorkstationStack extends Stack {

  public readonly server: HortacloudAppstream;

  constructor(scope: Construct,
              id: string,
              props: WorkstationStackProps) {
    super(scope, id, props);

    this.server = new HortacloudAppstream(this, 'Workstation', props);
  }
}

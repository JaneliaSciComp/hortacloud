import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortacloudAppstream } from './hortacloud-appstreamstack';
import { VpcInstanceProps } from '../../common/hortacloud-common';

export interface WorkstationStackProps extends StackProps, VpcInstanceProps {
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

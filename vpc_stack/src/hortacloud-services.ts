import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudJACS } from './hortacloud-jacs';
import { HortaCloudVPC } from './hortacloud-vpc';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

export interface ServicesStackProps extends StackProps {
  vpc: IVpc;
}

export class HortaCloudServicesStack extends Stack {

  public readonly server: HortaCloudJACS;

  constructor(scope: Construct, 
              id: string,
              props: ServicesStackProps) {
    super(scope, id, props);

    this.server = new HortaCloudJACS(this, 'JACS', props.vpc);
  }
}

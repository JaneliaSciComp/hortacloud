import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { HortaCloudJACS } from './hortacloud-jacs';
import { HortaCloudVPC } from './hortacloud-vpc';


export interface HortaCloudServicesProps extends StackProps {
  jacsInstanceType: string;
}


export class HortaCloudServicesStack extends Stack {

  public readonly vpc: HortaCloudVPC;
  public readonly server: HortaCloudJACS;

  constructor(scope: Construct, id: string, props?: HortaCloudServicesProps) {
    super(scope, id, props);

    this.vpc = new HortaCloudVPC(this, 'VPC');

    this.server = new HortaCloudJACS(this, 'JACS', {
      vpc: this.vpc,
      jacsInstanceType: props ? props.jacsInstanceType : 't2.micro'
    });

  }
}

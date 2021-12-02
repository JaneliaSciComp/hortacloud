import * as cdk from '@aws-cdk/core';
import { HortaCloudAppstream } from './hortacloud-appstream';
import { HortaCloudJACS } from './hortacloud-jacs';
import { HortaCloudVPC } from './hortacloud-vpc';
export class HortaCloudStack extends cdk.Stack {

  public readonly vpc: HortaCloudVPC;
  public readonly server: HortaCloudJACS;
  public readonly appstream: HortaCloudAppstream;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new HortaCloudVPC(this, 'VPC');

    this.server = new HortaCloudJACS(this, 'JACS', {
      vpc: this.vpc
    });

    this.appstream = new HortaCloudAppstream(this, 'Appstream', {
      vpc: this.vpc
    });

  }
}

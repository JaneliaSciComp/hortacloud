
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import { HortaCloudVPC } from './hortacloud-vpc';
import { Duration } from '@aws-cdk/core';

export interface HortaCloudAppstreamProps {
  vpc: HortaCloudVPC;
}

export class HortaCloudAppstream extends cdk.Construct {

  public readonly server: ec2.Instance;

  constructor(scope: cdk.Construct, id: string, props: HortaCloudAppstreamProps) {
    super(scope, id);


    // Pick a Windows edition to use
    const windows = ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);
    

  }
}


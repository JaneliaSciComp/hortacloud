import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import * as cdk from "aws-cdk-lib";

import { HortaCloudVPC } from '../../vpc_stack/src/hortacloud-vpc';

export class HortacloudAppstream extends Construct {

  public readonly server: ec2.Instance;

  constructor(scope: Construct,
              id: string) {
    super(scope, id);

    const vpcId = cdk.Fn.importValue('VpcID');

    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, 'HortaCloudImageBuilder', {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: 'HortaCloudImageBuilder',

      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: vpcId,
      }],

      displayName: 'HortaCloudImageBuilder',
      imageName: 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021'
    });

    // still need to add vpc configuration from main stack
    /* const hortaCloudFleet = new appstream.CfnFleet(this, 'HortaCloudFleet', {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: 'name',
      computeCapacity: {
        desiredInstances: 123,
      },
      displayName: 'HortaCloudAppstreamFleet',
      enableDefaultInternetAccess: false,
      fleetType: 'ON_DEMAND',
      maxUserDurationInSeconds: 960
    });

    const hortaCloudStack = new appstream.CfnStack(this, 'HortaCloudStack',{
      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: hortaVpc.vpc.vpcId,
      }],
      applicationSettings: {
        enabled: false
      },
      displayName: 'HortaCloudAppstreamStack',
      name: 'HortaCloudAppstreamStack',
    });

    const hortaCloudStackFleetAssociation = new appstream.CfnStackFleetAssociation(this, 'HortaCloudStackFleet', {
      fleetName: 'HortaCloudAppstreamFleet',
      stackName: 'HortaCloudAppstreamStack',
    }); */

    /*const hortaCloudApp = new appstream.CfnApplication(this, 'HortacloudAppstream', {
      appBlockArn: 'appBlockArn',
      iconS3Location: {
        s3Bucket: 's3Bucket',
        s3Key: 's3Key',
      },
      instanceFamilies: ['instanceFamilies'],
      launchPath: 'launchPath',
      name: 'name',
      platforms: ['platforms'],

    });*/

  }
}

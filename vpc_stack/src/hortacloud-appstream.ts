import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';

import { HortaCloudVPC } from './hortacloud-vpc';

export class HortaCloudAppstream extends Construct {

  public readonly server: ec2.Instance;

  constructor(scope: Construct,
              id: string,
              hortaVpc: HortaCloudVPC) {
    super(scope, id);

    // still need to add vpc configuration from main stack
    const hortaCloudFleet = new appstream.CfnFleet(this, 'MyCfnFleet', {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: 'name',
      computeCapacity: {
        desiredInstances: 123,
      },
      displayName: 'HortaCloudAppstreamFleet',
      enableDefaultInternetAccess: false,
      fleetType: 'On-demand',
      maxConcurrentSessions: 5,
      maxUserDurationInSeconds: 960
    });

    const hortaCloudStack = new appstream.CfnStack(this, 'MyCfnStack',{
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
    });

    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, 'HortaCloudImageBuilder', {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: 'HortaCloudImageBuilder',

      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: hortaVpc.vpc.vpcId,
      }],
      displayName: 'HortaCloudImageBuilder',
    });

    /*const hortaCloudApp = new appstream.CfnApplication(this, 'HortaCloudAppstream', {
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

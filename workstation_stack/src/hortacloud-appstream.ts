import { Construct } from 'constructs';
import { Fn } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string) {
    super(scope, id);

    const hortaConfig = getHortaCloudConfig();

    const hortaVPCKey = createResourceId(hortaConfig, 'VpcID');

    const vpcId = Fn.importValue(hortaVPCKey);

    const vpc = Vpc.fromLookup(scope,
      createResourceId(hortaConfig, 'vpc'),
      {
        isDefault: false,
        vpcId: vpcId
      });

    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, 'HortaCloudImageBuilder', {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: 'HortaCloudImageBuilder',

      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: vpcId,
      }],

      displayName: 'HortaCloudImageBuilder',
      enableDefaultInternetAccess: true,
      imageName: 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021',
      vpcConfig: {

      }
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

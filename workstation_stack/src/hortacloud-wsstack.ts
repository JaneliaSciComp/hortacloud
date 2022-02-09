import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string) {
    super(scope, id);
    const hortaCloudConfig = getHortaCloudConfig();

    const fleetInstanceName = createResourceId(hortaCloudConfig, 'workstation-fleet');
    const hortaCloudFleet = new appstream.CfnFleet(this, fleetInstanceName, {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: fleetInstanceName,
      imageName: "NvidiaGraphicsProWorkstation",
      computeCapacity: {
        desiredInstances: 5,
      },
      displayName: fleetInstanceName,
      enableDefaultInternetAccess: false,
      fleetType: 'ON_DEMAND',
      maxUserDurationInSeconds: 960
    });

    const stackInstanceName = createResourceId(hortaCloudConfig, 'workstation-stack');
    const hortaCloudStack = new appstream.CfnStack(this, stackInstanceName,{
      applicationSettings: {
        enabled: false
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
    });

    new CfnOutput(this, "FleetID", {
      value: hortaCloudFleet.name,
      exportName: createResourceId(hortaCloudConfig, 'FleetID')
    });

    new CfnOutput(this, "StackID", {
      value: stackInstanceName,
      exportName: createResourceId(hortaCloudConfig, 'StackID')
    });

   /* const stackFleetAssociationInstanceName = createResourceId(hortaCloudConfig, 'workstation-stack-fleet');
    const hortaCloudStackFleetAssociation = new appstream.CfnStackFleetAssociation(this, stackFleetAssociationInstanceName, {
      fleetName: fleetInstanceName,
      stackName: stackInstanceName,
    });*/

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

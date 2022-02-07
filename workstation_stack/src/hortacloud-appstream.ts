import { Construct } from 'constructs';
import { CfnOutput, Fn } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string) {
    super(scope, id);
    const hortaCloudConfig = getHortaCloudConfig();

    const hortaConfig = getHortaCloudConfig();

    const hortaVPCKey = createResourceId(hortaConfig, 'VpcID');

    const vpcId = Fn.importValue(hortaVPCKey);

    const vpc = Vpc.fromLookup(scope,
      createResourceId(hortaConfig, 'vpc'),
      {
        isDefault: false,
        vpcId: vpcId
      });

    const imageBuilderInstanceName = createResourceId(hortaCloudConfig, 'image-builder');
    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, imageBuilderInstanceName, {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: imageBuilderInstanceName,
      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: vpcId,
      }],
      displayName: imageBuilderInstanceName,
      enableDefaultInternetAccess: true,
      imageName: 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021',
      vpcConfig: {

      }
    });

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

    const stackInstanceName = createResourceId(hortaServicesConfig, 'workstation-stack');
    const hortaCloudStack = new appstream.CfnStack(this, stackInstanceName,{
      applicationSettings: {
        enabled: false
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
    });

    new CfnOutput(this, "FleetID", {
      value: hortaCloudFleet.name,
      exportName: `${hortaCloudConfig.hortaCloudOrg}-${hortaCloudConfig.hortaStage}-FleetID`
    });

    new CfnOutput(this, "StackID", {
      value: stackInstanceName,
      exportName: `${hortaCloudConfig.hortaCloudOrg}-${hortaCloudConfig.hortaStage}-StackID`
    });

   /* const stackFleetAssociationInstanceName = createResourceId(hortaServicesConfig, 'workstation-stack-fleet');
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

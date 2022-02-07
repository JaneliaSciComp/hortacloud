import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import * as cdk from "aws-cdk-lib";

import { getHortaCloudConfig } from './config';
import { HortaCloudVPC } from '../../vpc_stack/src/hortacloud-vpc';
import {createResourceId, getHortaServicesConfig} from "../../vpc_stack/src/hortacloud-config";

export class HortacloudAppstream extends Construct {

  public readonly server: ec2.Instance;

  constructor(scope: Construct,
              id: string) {
    super(scope, id);
    const hortaServicesConfig = getHortaServicesConfig();
    const hortaCloudConfig = getHortaCloudConfig();

    const vpcId = cdk.Fn.importValue('VpcID');

    const imageBuilderInstanceName = createResourceId(hortaServicesConfig, 'image-builder');
    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, imageBuilderInstanceName, {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: imageBuilderInstanceName,

      displayName: imageBuilderInstanceName,
      imageName: 'AppStream-Graphics-Pro-WinServer2019-07-19-2021'
    });

    const fleetInstanceName = createResourceId(hortaServicesConfig, 'workstation-fleet');
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

    new cdk.CfnOutput(this, "FleetID", {
      value: hortaCloudFleet.name,
      exportName: `${hortaCloudConfig.hortaCloudOrg}-${hortaCloudConfig.hortaStage}-FleetID`
    });

    new cdk.CfnOutput(this, "StackID", {
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

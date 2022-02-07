import { Construct } from 'constructs';
import { CfnOutput, Fn, Token } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import * as appstream from 'aws-cdk-lib/aws-appstream';
import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string) {
    super(scope, id);
    const hortaCloudConfig = getHortaCloudConfig();

    const hortaConfig = getHortaCloudConfig();

    const hortaVPCIDKey = createResourceId(hortaConfig, 'VpcID');
    const hortaVPCKey = createResourceId(hortaConfig, 'vpc');

    const vpc = Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: Fn.importValue(hortaVPCIDKey),
      availabilityZones: ['us-east-1a'],
      privateSubnetIds: [
        Fn.importValue(`janelia-hc-vpc-cgdev:ExportsOutputRefjaneliahcvpccgdevPrivateSubnet1SubnetAD54AD79962E8AF4`)
      ]
    });

    console.log('Imported VPC', vpc);
    // const vpcIdToken = Fn.getAtt(hortaVPCKey, 'VpcID');
    // const vpcId = vpcIdToken.resolve('VpcID');

    // const vpc = Vpc.fromLookup(scope,
    //   createResourceId(hortaConfig, 'vpc'),
    //   {
    //     isDefault: false,
    //     vpcId: vpcId
    //   });

    const imageBuilderInstanceName = createResourceId(hortaCloudConfig, 'image-builder');
    const hortaCloudImageBuilder = new appstream.CfnImageBuilder(this, imageBuilderInstanceName, {
      instanceType: 'stream.graphics-pro.4xlarge',
      name: imageBuilderInstanceName,
      accessEndpoints: [{
        endpointType: 'STREAMING',
        vpceId: vpc.vpcId,
      }],
      displayName: imageBuilderInstanceName,
      enableDefaultInternetAccess: true,
      imageName: 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021'
      // vpcConfig: {
      //   subnetIds: vpc.publicSubnets.map(sn => sn.subnetId)
      // }
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

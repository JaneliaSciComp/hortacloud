import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { CfnFleet, CfnStack, CfnStackFleetAssociation } from 'aws-cdk-lib/aws-appstream';
import { createResourceId, getHortaCloudConfig, VpcInstanceProps } from '../../common/hortacloud-common';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string,
              vpcProps: VpcInstanceProps) {
    super(scope, id);
    const hortaCloudConfig = getHortaCloudConfig();

    // create the fleet
    const fleetInstanceName = createResourceId(hortaCloudConfig, 'workstation-fleet');
    const imageName = createResourceId(hortaCloudConfig, 'HortaCloudWorkstation');
    new CfnFleet(this, 'HortaCloudFleet', {
      instanceType: 'stream.graphics.g4dn.xlarge',
      name: fleetInstanceName,
      imageName: imageName,
      computeCapacity: {
        desiredInstances: 5,
      },
      displayName: fleetInstanceName,
      enableDefaultInternetAccess: false,
      fleetType: 'ON_DEMAND',
      vpcConfig: {
        subnetIds: [
          ...vpcProps.privateSubnetIds,
          ...vpcProps.publicSubnetIds
        ]
      },
      maxUserDurationInSeconds: 960
    });

    // create the stack
    const stackInstanceName = createResourceId(hortaCloudConfig, 'workstation-stack');
    new CfnStack(this, 'HortaCloudStack', {
      applicationSettings: {
        enabled: false
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
    });

    // associate the stack with the fleet
    new CfnStackFleetAssociation(this, 'HortaCloudFleetStackAssoc', {
      fleetName: fleetInstanceName,
      stackName: stackInstanceName,
    });

    // export the fleet and the stack
    new CfnOutput(this, "FleetID", {
      value: fleetInstanceName,
      exportName: createResourceId(hortaCloudConfig, 'FleetID')
    });

    new CfnOutput(this, "StackID", {
      value: stackInstanceName,
      exportName: createResourceId(hortaCloudConfig, 'StackID')
    });
  }
}

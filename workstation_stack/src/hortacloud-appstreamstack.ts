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
    const fleetInstance = new CfnFleet(this, 'HortaCloudFleet', {
      instanceType: hortaCloudConfig.hortaWorkstationInstanceType,
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
      maxUserDurationInSeconds: 960 * 60, // this value is in seconds
    });

    // create the stack
    const stackInstanceName = createResourceId(hortaCloudConfig, 'workstation-stack');
    const stackInstance = new CfnStack(this, 'HortaCloudStack', {
      applicationSettings: {
        enabled: false
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
    });

    // associate the stack with the fleet
    const stackFleetAssoc = new CfnStackFleetAssociation(this, 'HortaCloudFleetStackAssoc', {
      fleetName: fleetInstance.name,
      stackName: stackInstanceName
    });

    stackFleetAssoc.addDependsOn(fleetInstance);
    stackFleetAssoc.addDependsOn(stackInstance);

    // export the fleet and the stack
    new CfnOutput(this, "FleetID", {
      value: fleetInstance.name,
      exportName: createResourceId(hortaCloudConfig, 'FleetID')
    });

    new CfnOutput(this, "StackID", {
      value: stackInstanceName,
      exportName: createResourceId(hortaCloudConfig, 'StackID')
    });
  }
}

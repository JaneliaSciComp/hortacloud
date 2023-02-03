import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { CfnFleet, CfnStack, CfnStackFleetAssociation } from 'aws-cdk-lib/aws-appstream';
import { createResourceId, VpcInstanceProps } from '../../common/hortacloud-common';
import { getHortaAppstreamConfig } from './hortacloud-appstream-config';

export class HortacloudAppstream extends Construct {

  constructor(scope: Construct,
              id: string,
              vpcProps: VpcInstanceProps) {
    super(scope, id);
    const hortaCloudConfig = getHortaAppstreamConfig();

    // create the fleet
    const fleetInstanceName = createResourceId(hortaCloudConfig, 'workstation-fleet');
    const imageName = createResourceId(hortaCloudConfig, 'HortaCloudWorkstation');
    const fleetInstance = new CfnFleet(this, 'HortaCloudFleet', {
      instanceType: hortaCloudConfig.hortaWorkstationInstanceType,
      name: fleetInstanceName,
      imageName: imageName,
      computeCapacity: {
        desiredInstances: hortaCloudConfig.appstreamComputeCapacity,
      },
      displayName: fleetInstanceName,
      enableDefaultInternetAccess: true,
      fleetType: 'ON_DEMAND',
      vpcConfig: {
        subnetIds: [
          ...vpcProps.publicSubnetIds,
          ...vpcProps.privateSubnetIds,
        ],
      },
      disconnectTimeoutInSeconds: hortaCloudConfig.sessionDisconnectInSecs,
      maxUserDurationInSeconds: hortaCloudConfig.sessionDurationInMin * 60, // this value is in seconds
    });

    // create the stack
    const stackInstanceName = createResourceId(hortaCloudConfig, 'workstation-stack');
    const stackInstance = new CfnStack(this, 'HortaCloudStack', {
      applicationSettings: {
        enabled: true,
        settingsGroup: stackInstanceName,
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
      storageConnectors: [{
        connectorType: 'HOMEFOLDERS',
      }]
    });

    // associate the stack with the fleet
    const stackFleetAssoc = new CfnStackFleetAssociation(this, 'HortaCloudFleetStackAssoc', {
      fleetName: fleetInstance.name,
      stackName: stackInstanceName,
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

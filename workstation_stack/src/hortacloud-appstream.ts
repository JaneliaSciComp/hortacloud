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
    const hortaAppstreamConfig = getHortaAppstreamConfig();

    // create the fleet
    const fleetInstanceName = createResourceId(hortaAppstreamConfig, 'workstation-fleet');
    const imageName = createResourceId(hortaAppstreamConfig, 'HortaCloudWorkstation');
    const fleetInstance = new CfnFleet(this, 'HortaCloudFleet', {
      instanceType: hortaAppstreamConfig.hortaWorkstationInstanceType,
      name: fleetInstanceName,
      imageName: imageName,
      computeCapacity: {
        desiredInstances: hortaAppstreamConfig.appstreamComputeCapacity,
      },
      displayName: fleetInstanceName,
      enableDefaultInternetAccess: false,
      fleetType: 'ON_DEMAND',
      vpcConfig: {
        subnetIds: vpcProps.privateSubnetIds,
      },
      disconnectTimeoutInSeconds: hortaAppstreamConfig.sessionDisconnectInSecs,
      maxUserDurationInSeconds: hortaAppstreamConfig.sessionDurationInMin * 60, // this value is in seconds
    });

    const storageConnectors = [
      getStorageConnector('HOMEFOLDERS', true),
      getStorageConnector('GOOGLE_DRIVE', false, hortaAppstreamConfig.googleDomains),
      getStorageConnector('ONE_DRIVE', false, hortaAppstreamConfig.oneDriveDomains),
    ].filter(s => s.connectorType); // filter out the storage connectors without a valid connectorType

    // create the stack
    const stackInstanceName = createResourceId(hortaAppstreamConfig, 'workstation-stack');
    const stackInstance = new CfnStack(this, 'HortaCloudStack', {
      applicationSettings: {
        enabled: true,
        settingsGroup: stackInstanceName,
      },
      displayName: stackInstanceName,
      name: stackInstanceName,
      storageConnectors: storageConnectors,
    });

    // associate the stack with the fleet
    const stackFleetAssoc = new CfnStackFleetAssociation(this, 'HortaCloudFleetStackAssoc', {
      fleetName: fleetInstance.name,
      stackName: stackInstanceName,
    });

    stackFleetAssoc.addDependency(fleetInstance);
    stackFleetAssoc.addDependency(stackInstance);

    // export the fleet and the stack
    new CfnOutput(this, "FleetID", {
      value: fleetInstance.name,
      exportName: createResourceId(hortaAppstreamConfig, 'FleetID')
    });

    new CfnOutput(this, "StackID", {
      value: stackInstanceName,
      exportName: createResourceId(hortaAppstreamConfig, 'StackID')
    });
  }
}

function getStorageConnector(connectorType: string, allowEmptyDomains: boolean, domains?: string[]) : CfnStack.StorageConnectorProperty {
  if ((domains && domains.length > 0) || allowEmptyDomains) {
    return {
      connectorType: connectorType,
      domains: domains
    };
  } else {
    return {
      connectorType: '', // invalid connector type
    };
  }
}

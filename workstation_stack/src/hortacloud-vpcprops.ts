import { createResourceId, HortaCloudConfig } from '../../common/hortacloud-common';
import { Fn } from 'aws-cdk-lib';

export interface VpcInstanceProps {
  vpcId: string,
  privateSubnetId: string,
  publicSubnetId: string
}

export function getVPCProps(hortaConfig: HortaCloudConfig) : VpcInstanceProps {
  const hortaVPCIDKey = createResourceId(hortaConfig, 'VpcID');
  return {
    vpcId: Fn.importValue(hortaVPCIDKey),
    privateSubnetId: Fn.importValue(createResourceId(hortaConfig, 'PrivateSubnetID')),
    publicSubnetId: Fn.importValue(createResourceId(hortaConfig, 'PublicSubnetID'))
  };
}

import { Construct } from 'constructs';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';

export interface VpcInstanceProps {
  vpcId: string,
  privateSubnetId: string,
  publicSubnetId: string
}

export function getVPC(scope: Construct, props: VpcInstanceProps) : IVpc {
  const vpc = Vpc.fromVpcAttributes(scope, 'VPC', {
    vpcId: props.vpcId,
    availabilityZones: ['us-east-1'],
    privateSubnetIds: [ props.privateSubnetId ],
    publicSubnetIds: [ props.publicSubnetId ]
  });

  console.log('Imported VPC', vpc);

  return vpc;
}

import { Construct } from 'constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService, 
         Port, SecurityGroup, SubnetType, IVpc, Vpc, } from 'aws-cdk-lib/aws-ec2';
import { getHortaServicesConfig, HortaCloudServicesConfig } from './hortacloud-services-config';
import { createResourceId } from '../../common/hortacloud-common';

export class HortaCloudVPC extends Stack {

  public readonly vpc: IVpc;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const hortaConfig = getHortaServicesConfig();

    this.vpc = createVPC(this, hortaConfig);

    // Security Group to be used by EC2 instances and accessed via Systems Manager
    const ssmPrivateSG = new SecurityGroup(this, 'SSMPrivateSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'EC2 Instance Security Group',
      description: 'EC2 Instance Security Group',
      allowAllOutbound: true,
    });

    // adding interface endpoints for Systems Manger use - only 443 from EC2-SG to Interface Endpoints necessary
    // from https://github.com/aws-samples/aws-transit-gateway-egress-vpc-pattern/blob/master/lib/egress_vpc-tg-demo-stack.ts

    const ssmIE = this.vpc.addInterfaceEndpoint('SSM', {
      service: InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      subnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      },
    });
    ssmIE.connections.allowFrom(ssmPrivateSG, Port.tcp(443), 'Allow from SSM IE Private SG');

    const ssmMessagesIE = this.vpc.addInterfaceEndpoint('SSMMessages', {
      service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      privateDnsEnabled: true,
      subnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      },
    });
    ssmMessagesIE.connections.allowFrom(ssmPrivateSG, Port.tcp(443), 'Allow from SSM Messages IE Private SG');

    const ec2IE = this.vpc.addInterfaceEndpoint('EC2', {
      service: InterfaceVpcEndpointAwsService.EC2,
      privateDnsEnabled: true,
      subnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      },
    });
    ec2IE.connections.allowFrom(ssmPrivateSG, Port.tcp(443), 'Allow from EC2 IE Private SG');

    const ec2Messages = this.vpc.addInterfaceEndpoint('EC2Messages', {
      service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      privateDnsEnabled: true,
      subnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      },
    });
    ec2Messages.connections.allowFrom(ssmPrivateSG, Port.tcp(443), 'Allow from EC2 Messages IE Private SG');

    this.vpc.addGatewayEndpoint('S3-SSM', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      }],
    });

    new CfnOutput(this, 'VpcID', {
      value: this.vpc.vpcId,
      exportName: createResourceId(hortaConfig, 'VpcID')
    });

    new CfnOutput(this, 'PrivateSubnetID', {
      value: this.vpc.privateSubnets.map(sn => sn.subnetId).join(','),
      exportName: createResourceId(hortaConfig, 'PrivateSubnetID')
    });

    new CfnOutput(this, 'PublicSubnetID', {
      value: this.vpc.publicSubnets.map(sn => sn.subnetId).join(','),
      exportName: createResourceId(hortaConfig, 'PublicSubnetID')
    });

  }
}

function createVPC(scope: Construct, config: HortaCloudServicesConfig) : IVpc {
  return new Vpc(scope, createResourceId(config, 'vpc'), {
    cidr: '10.0.0.0/16',
    maxAzs: 1,
    natGateways: 1,
    subnetConfiguration: [
      {
        cidrMask: 24,
        subnetType: SubnetType.PRIVATE_WITH_NAT,
        name: 'Private'
      },
      { 
        // Public subnet is only necessary for the NAT Gateway
        cidrMask: 24,
        subnetType: SubnetType.PUBLIC,    
        name: 'Public'
      },
    ],
    vpcName: createResourceId(config, 'vpc')
  });
}

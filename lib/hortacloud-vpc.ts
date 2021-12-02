import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface HortaCloudVPCProps {
}

export class HortaCloudVPC extends cdk.Construct {

  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id: string, props?: HortaCloudVPCProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, id, {
      cidr: '10.0.0.0/16',          
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          name: 'Private',
        },
        { 
          // Public subnet is only necessary for the NAT Gateway
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC,    
          name: 'Public',
        },
      ],
    });

    // Security Group to be used by EC2 instances and accessed via Systems Manager
    const ssmPrivateSG = new ec2.SecurityGroup(this, 'SSMPrivateSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: 'EC2 Instance Security Group',
      description: 'EC2 Instance Security Group',
      allowAllOutbound: true,
    });

    this.vpc.addGatewayEndpoint('S3SSM', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, onePerAz: true }],
    });

    // adding interface endpoints for Systems Manger use - only 443 from EC2-SG to Interface Endpoints necessary
    // from https://github.com/aws-samples/aws-transit-gateway-egress-vpc-pattern/blob/master/lib/egress_vpc-tg-demo-stack.ts

    const ssmIE = this.vpc.addInterfaceEndpoint('SSM', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, onePerAz: true },
    });
    ssmIE.connections.allowFrom(ssmPrivateSG, ec2.Port.tcp(443), 'Allow from SSM IE Private SG');

    const ssmMessagesIE = this.vpc.addInterfaceEndpoint('SSMMessages', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, onePerAz: true },
    });
    ssmMessagesIE.connections.allowFrom(ssmPrivateSG, ec2.Port.tcp(443), 'Allow from SSM Messages IE Private SG');

    const ec2IE = this.vpc.addInterfaceEndpoint('EC2', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, onePerAz: true },
    });
    ec2IE.connections.allowFrom(ssmPrivateSG, ec2.Port.tcp(443), 'Allow from EC2 IE Private SG');

    const ec2Messages = this.vpc.addInterfaceEndpoint('EC2Messages', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, onePerAz: true },
    });
    ec2Messages.connections.allowFrom(ssmPrivateSG, ec2.Port.tcp(443), 'Allow from EC2 Messages IE Private SG');

  }
}

import { Construct } from 'constructs';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService, 
         Port, SecurityGroup, SubnetType, IVpc, Vpc, VpcProps, } from 'aws-cdk-lib/aws-ec2';
import { getHortaConfig } from './hortacloud-config';


export interface HortaCloudVPCProps extends VpcProps {
}

export class HortaCloudVPC extends Construct {

  public readonly vpc: IVpc;

  constructor(scope: Construct, id: string, props?: HortaCloudVPCProps) {
    super(scope, id);

    this.vpc = createVPC(this, id);

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
  }

}

function createVPC(scope: Construct, id: string) : IVpc {
  const hortaConfig = getHortaConfig();

  return new Vpc(scope, id, {
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
  });
}

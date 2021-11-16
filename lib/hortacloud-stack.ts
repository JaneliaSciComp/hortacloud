import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import { Duration } from '@aws-cdk/core';

const dockerComposeVersion = '1.29.2';
export class HortaCloudStack extends cdk.Stack {

  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'VPC', {
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
      securityGroupName: 'Demo EC2 Instance Security Group',
      description: 'Demo EC2 Instance Security Group',
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

    // 👇 create Security Group for the Instance
    const serverSG = new ec2.SecurityGroup(this, 'webserver-sg', {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    // TODO: these ingress rules should have source as the AppStream security group

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH access from anywhere',
    );

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(9881),
      'allow JADE traffic from anywhere',
    );

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5672),
      'allow RabbitMQ traffic from anywhere',
    );

    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(15672),
      'allow RabbitMQ traffic from anywhere',
    );

    // create a Role for the EC2 Instance
    const serverRole = new iam.Role(this, 'webserver-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    const latestLinuxAMI = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    const handle = new ec2.InitServiceRestartHandle();

    const server = new ec2.Instance(this, 'Instance', {
      vpc : this.vpc,
      vpcSubnets : {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      },
      role: serverRole,
      securityGroup: serverSG,
      instanceType : ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage : latestLinuxAMI,

      // Showing the most complex setup, if you have simpler requirements
      // you can use `CloudFormationInit.fromElements()`.
      init: ec2.CloudFormationInit.fromElements(
        ec2.InitCommand.shellCommand('yum update -y'),
        ec2.InitPackage.yum('docker'),
        ec2.InitService.enable('docker', { serviceRestartHandle: handle }),
        ec2.InitCommand.shellCommand('usermod -aG docker ec2-user'),
        ec2.InitCommand.shellCommand(`curl -L "https://github.com/docker/compose/releases/download/${dockerComposeVersion}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ; chmod +x /usr/local/bin/docker-compose`),
        ec2.InitPackage.yum('git'),
      ),
      initOptions: {
        // Optional, how long the installation is expected to take (5 minutes by default)
        timeout: Duration.minutes(10),

        // Optional, whether to include the --url argument when running cfn-init and cfn-signal commands (false by default)
        // includeUrl: true,
    
        // Optional, whether to include the --role argument when running cfn-init and cfn-signal commands (false by default)
        // includeRole: true,
      },
    });
    
    // new s3.Bucket(this, 'horta-private-samples', {
    //     versioned: true,
    //     removalPolicy: cdk.RemovalPolicy.DESTROY,
    //     autoDeleteObjects: true
    // });

    // Pick a Windows edition to use
    const windows = ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);
    

  }
}

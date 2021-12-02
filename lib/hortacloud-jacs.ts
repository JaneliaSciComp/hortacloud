import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as path from 'path';
import { HortaCloudVPC } from './hortacloud-vpc';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Duration } from '@aws-cdk/core';

export interface HortaCloudVPCProps {
  vpc: HortaCloudVPC;
}

export class HortaCloudJACS extends cdk.Construct {

  public readonly server: ec2.Instance;

  constructor(scope: cdk.Construct, id: string, props: HortaCloudVPCProps) {
    super(scope, id);

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

    // 👇 create Security Group for the Instance
    const serverSG = new ec2.SecurityGroup(this, 'server-sg', {
        vpc: props.vpc.vpc,
        allowAllOutbound: true,
      });
  
      // TODO: these ingress rules should have source as the AppStream security group
  
      // serverSG.addIngressRule(
      //   ec2.Peer.anyIpv4(),
      //   ec2.Port.tcp(22),
      //   'allow SSH access from anywhere',
      // );
  
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

      
    const server = new ec2.Instance(this, 'Instance', {
      vpc : props.vpc.vpc,
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
        // ec2.InitCommand.shellCommand('yum update -y'),
        // ec2.InitPackage.yum('docker'),
        // ec2.InitService.enable('docker', { serviceRestartHandle: handle }),
        // ec2.InitCommand.shellCommand('usermod -aG docker ec2-user'),
        // ec2.InitCommand.shellCommand(`curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ; chmod +x /usr/local/bin/docker-compose`),
        // ec2.InitPackage.yum('git'),
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
    
    // Create an asset that will be used as part of User Data to run on first load
    // Borrowed from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/ec2-instance/lib/ec2-cdk-stack.ts
    const asset = new Asset(this, 'Asset', { path: path.join(__dirname, '../src/server-init.sh') });
    const localPath = server.userData.addS3DownloadCommand({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
    });

    server.userData.addExecuteFileCommand({
      filePath: localPath
    });
    asset.grantRead(server.role);

    // Create outputs for connecting
    // new cdk.CfnOutput(this, 'IP Address', { value: server.instancePublicIp });
    // new cdk.CfnOutput(this, 'Key Name', { value: key.keyPairName })
    // new cdk.CfnOutput(this, 'Download Key Command', { value: 'aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem' })
    // new cdk.CfnOutput(this, 'SSH Command', { value: 'ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@' + server.instancePublicIp })

    // new s3.Bucket(this, 'horta-private-samples', {
    //     versioned: true,
    //     removalPolicy: cdk.RemovalPolicy.DESTROY,
    //     autoDeleteObjects: true
    // });


  }
}

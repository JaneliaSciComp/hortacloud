import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { HortaCloudVPC } from './hortacloud-vpc';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Duration } from 'aws-cdk-lib';

export interface HortaCloudJACSProps {
  vpc: HortaCloudVPC;
  jacsInstanceType: string;
}

export class HortaCloudJACS extends Construct {

  public readonly server: ec2.Instance;

  constructor(scope: Construct, id: string, props: HortaCloudJACSProps) {
    super(scope, id);

    // create a Role for the EC2 Instance
    const serverRole = new iam.Role(this, 'webserver-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    const jacsMachineImage = createJacsMachineImage(props);

    // 👇 create Security Group for the Instance
    const serverSG = new ec2.SecurityGroup(this, 'server-sg', {
        vpc: props.vpc.vpc,
        allowAllOutbound: true,
    });
    
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
      ...jacsMachineImage
    });
    
    // Create an asset that will be used as part of User Data to run on first load
    const asset = new Asset(this, 'Asset', { path: path.join(__dirname, 'jacs/server-node-init.sh') });
    const localPath = server.userData.addS3DownloadCommand({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
    });

    server.userData.addExecuteFileCommand({
      filePath: localPath
    });
    asset.grantRead(server.role);

  }
}

function createJacsMachineImage(jacsProps: HortaCloudJACSProps) {
  const jacsMachineImage = ec2.MachineImage.fromSsmParameter(
    '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
    {
      os: ec2.OperatingSystemType.LINUX
    }    
  )

  return {
    instanceType: new ec2.InstanceType(jacsProps.jacsInstanceType),
    machineImage: jacsMachineImage
  }
}
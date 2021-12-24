import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { getHortaServicesConfig, HortaCloudServicesConfig, HortaCloudConfig, createResourceId } from './hortacloud-config';
import { HortaCloudVPC } from './hortacloud-vpc';

interface HortaCloudMachine {
  readonly instanceType: ec2.InstanceType,
  readonly machineImage: ec2.IMachineImage;
  readonly keyName?: string;
}

interface AssetOpts {
  name: string;
  path: string,
  arguments?: string[];
}

interface SecurityRules {
  port: number;
  description: string;
}

export class HortaCloudJACS extends Construct {

  public readonly server: ec2.Instance;
  public readonly dataBucket: s3.Bucket;

  constructor(scope: Construct, 
              id: string,
              hortaVpc: HortaCloudVPC) {
    super(scope, id);

    const hortaConfig = getHortaServicesConfig();
 
    // create Security Group for the Instance
    const serverSG = createSecurityGroup(this, hortaVpc.vpc, [
      {
        port: 22,
        description: 'allow SSH access from anywhere'
      },
      {
        port: 80,
        description: 'allow HTTP traffic from anywhere'
      },
      {
        port: 443,
        description: 'allow HTTPS traffic from anywhere',
      },
      {
        port: 9881,
        description: 'allow JADE traffic from anywhere'
      },
      {
        port: 5672,
        description: 'allow RabbitMQ traffic from anywhere'
      },
      {
        port: 15672,
        description: 'allow RabbitMQ traffic from anywhere'
      }
    ]);

    // create a Role for the EC2 Instance
    const serverRole = new iam.Role(this, 'jacs-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    const jacsMachineImage = createJacsMachineImage(hortaConfig);
    
    const jacsNodeInstanceName = createResourceId(hortaConfig, 'jacs-node');
    this.server = new ec2.Instance(this, jacsNodeInstanceName, {
      vpc : hortaVpc.vpc,
      vpcSubnets : {
        subnetType: hortaConfig.withPublicAccess 
                      ? ec2.SubnetType.PUBLIC
                      : ec2.SubnetType.PRIVATE_WITH_NAT
      },
      role: serverRole,
      securityGroup: serverSG,
      instanceName: jacsNodeInstanceName,
      blockDevices: [
        {
          deviceName: '/dev/xvdb',
          volume: ec2.BlockDeviceVolume.ebs(hortaConfig.hortaDataVolumeSizeGB)
        }
      ],
      ...jacsMachineImage
    });

    // create the data bucket
    const dataBucketName = createResourceId(hortaConfig, 'data')
    this.dataBucket = new s3.Bucket(this, dataBucketName, {
      bucketName: dataBucketName,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });
    this.dataBucket.grantReadWrite(this.server.role);
    
    createAssets(this, this.server, [
      {
        name: 'InitInstanceAsset',
        path: 'jacs/server-node-init.sh',
        arguments: [dataBucketName]
      },
      {
        name: 'InitJacsStackAsset',
        path: 'jacs/install-jacs-stack.sh',
        arguments: [
          hortaConfig.jwtKey,
          hortaConfig.mongoKey,
          hortaConfig.appPassword,
          hortaConfig.rabbitMQPassword,
          hortaConfig.jacsAPIKey,
          hortaConfig.jadeAPIKey,
          hortaConfig.searchMemGB
        ]
      },
      {
        name: 'CleanupAsset',
        path: 'jacs/cleanup.sh'
      }
    ]);
  }

}

function createSecurityGroup(scope: Construct, vpc: ec2.IVpc, sgRules: SecurityRules[]) :ec2.ISecurityGroup {
  const serverSG = new ec2.SecurityGroup(scope, 'server-sg', {
    vpc: vpc,
    allowAllOutbound: true,
  });


  sgRules.forEach(r => {
    serverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(r.port),
      r.description
    );
  })

  return serverSG;
}

function createJacsMachineImage(cfg: HortaCloudServicesConfig) : HortaCloudMachine {
  const jacsMachineImage = ec2.MachineImage.latestAmazonLinux({
    generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    edition: ec2.AmazonLinuxEdition.STANDARD,
    virtualization: ec2.AmazonLinuxVirt.HVM,
    storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    cpuType: ec2.AmazonLinuxCpuType.X86_64,
  });

  return {
    instanceType: new ec2.InstanceType(cfg.hortaServerInstanceType),
    machineImage: jacsMachineImage,
    keyName: cfg.hortaServerKeyPairName
  };
}

function createAssets(scope: Construct, instance: ec2.Instance, assetsOpts: AssetOpts[]) {
  assetsOpts.forEach(opts => {
    // Create an asset that will be used as part of User Data to run on first load
    const asset = new Asset(scope, opts.name, {
      path: path.join(__dirname, opts.path)
    });
    const localPath = instance.userData.addS3DownloadCommand({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
    });
    const args = opts.arguments 
                  ? opts.arguments.map(s => {
                      return s === '' ? '""' : s
                  }).join(' ')
                  : undefined;
    instance.userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: args
    });
    asset.grantRead(instance.role);
  });
}

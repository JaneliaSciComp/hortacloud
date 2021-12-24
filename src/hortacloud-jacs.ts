import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { HortaCloudVPC } from './hortacloud-vpc';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { getHortaConfig, HortaCloudConfig } from './hortacloud-config';

export interface HortaCloudJACSProps {
  vpc: HortaCloudVPC;
}

interface HortaCloudMachine {
  readonly instanceType: ec2.InstanceType,
  readonly machineImage: ec2.IMachineImage;
  readonly keyName?: string;
}

export class HortaCloudJACS extends Construct {

  public readonly server: ec2.Instance;
  public readonly dataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: HortaCloudJACSProps) {
    super(scope, id);

    const hortaConfig = getHortaConfig();
 
    // create Security Group for the Instance
    const serverSG = createSecurityGroup(this, props.vpc.vpc, hortaConfig.withPublicAccess);

    // create a Role for the EC2 Instance
    const serverRole = new iam.Role(this, 'jacs-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    const jacsMachineImage = createJacsMachineImage(hortaConfig);
    
    this.server = new ec2.Instance(this, 'Instance', {
      vpc : props.vpc.vpc,
      vpcSubnets : {
        subnetType: hortaConfig.withPublicAccess 
                      ? ec2.SubnetType.PUBLIC
                      : ec2.SubnetType.PRIVATE_WITH_NAT
      },
      role: serverRole,
      securityGroup: serverSG,
      instanceName: createHortaServerInstanceName(hortaConfig),
      blockDevices: [
        {
          deviceName: '/dev/xvdb',
          volume: ec2.BlockDeviceVolume.ebs(hortaConfig.hortaDataVolumeSizeGB)
        }
      ],
      ...jacsMachineImage
    });

    // create the data bucket
    const dataBucketName = createDataBucketName(hortaConfig)
    this.dataBucket = new s3.Bucket(this, 'DataBucket', {
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
        arguments: dataBucketName
      },
      {
        name: 'InitJacsStackAsset',
        path: 'jacs/install-jacs-stack.sh',
        arguments: `"${hortaConfig.jwtKey}" "${hortaConfig.mongoKey}" "${hortaConfig.appPassword}" "${hortaConfig.rabbitMQPassword} ${hortaConfig.jacsAPIKey} ${hortaConfig.jadeAPIKey}" "${hortaConfig.searchMemGB}"`
      },
      {
        name: 'CleanupAsset',
        path: 'jacs/cleanup.sh'
      }
    ]);
  }

}

function createSecurityGroup(scope: Construct, vpc: ec2.IVpc, withSSH?: boolean) :ec2.ISecurityGroup {
  const serverSG = new ec2.SecurityGroup(scope, 'server-sg', {
    vpc: vpc,
    allowAllOutbound: true,
  });

  if (withSSH)
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

  return serverSG;
}

function createJacsMachineImage(cfg: HortaCloudConfig) : HortaCloudMachine {
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

function createHortaServerInstanceName(cfg: HortaCloudConfig):string {
  return `${cfg.hortaCloudOrg}-hortacloud-jacs-${cfg.hortaStage}`
}

function createDataBucketName(cfg: HortaCloudConfig):string {
  return `${cfg.hortaCloudOrg}-hortacloud-data-${cfg.hortaStage}`
}

interface AssetOpts {
  name: string;
  path: string,
  arguments?: string;
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
    instance.userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: opts.arguments
    });
    asset.grantRead(instance.role);
  });
}

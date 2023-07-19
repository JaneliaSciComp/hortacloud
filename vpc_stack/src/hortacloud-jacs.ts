import { Construct } from 'constructs';
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Role, PolicyStatement, ServicePrincipal, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { getHortaServicesConfig, HortaCloudServicesConfig } from './hortacloud-services-config';

import { createResourceId } from '../../common/hortacloud-common';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

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

const { AWS_REGION } = process.env;

export class HortaCloudJACS extends Construct {

  public readonly server: ec2.Instance;
  public readonly defaultDataBucket: s3.Bucket;

  constructor(scope: Construct,
    id: string,
    hortaVpc: IVpc) {
    super(scope, id);

    const hortaConfig = getHortaServicesConfig();

    // create Security Group for the Instance
    const serverSG = createSecurityGroup(this, hortaVpc, [
      {
        port: hortaConfig.withPublicAccess ? 22 : 0,
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
        port: 8080,
        description: 'allow dashboard from anywhere'
      },
      {
        port: 8890,
        description: 'allow solr from anywhere'
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
    const serverRole = new Role(this, 'jacs-role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    addRolePolicies(serverRole, [
      new PolicyStatement({
        actions: [
          'lambda:InvokeFunction'
        ],
        effect: Effect.ALLOW,
        resources: [
          '*'
        ]
      })
    ]);

    const jacsMachineImage = createJacsMachineImage(hortaConfig);

    const jacsNodeInstanceName = createResourceId(hortaConfig, 'jacs-node');
    this.server = new ec2.Instance(this, jacsNodeInstanceName, {
      vpc: hortaVpc,
      vpcSubnets: {
        subnetType: hortaConfig.withPublicAccess
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      role: serverRole,
      securityGroup: serverSG,
      instanceName: jacsNodeInstanceName,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(hortaConfig.hortaSystemVolumeSizeGB),
        },
        {
          deviceName: '/dev/xvdb',
          volume: ec2.BlockDeviceVolume.ebs(hortaConfig.hortaDataVolumeSizeGB),
        }
      ],
      ...jacsMachineImage
    });

    // output instance IP
    new CfnOutput(this, 'ServerIP', {
      value: hortaConfig.withPublicAccess
        ? this.server.instancePublicDnsName
        : this.server.instancePrivateDnsName,
      exportName: createResourceId(hortaConfig, 'ServerIP')
    });

    // prepare all data buckets, i.e. default data bucket and external data buckets
    const defaultDataBucketName = createResourceId(hortaConfig, 'data');
    this.defaultDataBucket = new s3.Bucket(this, defaultDataBucketName, {
      bucketName: defaultDataBucketName,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });
    this.defaultDataBucket.grantReadWrite(this.server.role);

    const backupBucketName = hortaConfig.hortaBackupBucket ? hortaConfig.hortaBackupBucket : '';
    const restoreBucketName = hortaConfig.hortaRestoreBucket ? hortaConfig.hortaRestoreBucket : '';

    const externalDataBucketsCandidates = hortaConfig.hortaDataBuckets
      ? [...hortaConfig.hortaDataBuckets.split(',').map(s => s.trim()), backupBucketName, restoreBucketName]
      : [];

    const externalDataBuckets = [...new Set(externalDataBucketsCandidates.filter(s => s))];
    console.log('External buckets:', externalDataBuckets);

    externalDataBuckets.forEach(bn => {
      // external data buckets must exist
      const externalBucket = s3.Bucket.fromBucketName(this, bn, bn);
      externalBucket.grantReadWrite(this.server.role);
    })

    const dataBucketNames = [...externalDataBuckets, defaultDataBucketName];

    const dataBackupFolder = hortaConfig.hortaBackupFolder ? hortaConfig.hortaBackupFolder : '/hortacloud/backups';
    const jacsGitBranchArgs:string[] = hortaConfig.jacsGitBranch
      ? [
          '--jacs-git-branch',
          hortaConfig.jacsGitBranch,
        ]
      : [];
    const backupArgs:string[] = backupBucketName
      ? [
         '--backup',
         backupBucketName,
         dataBackupFolder,
         AWS_REGION || 'unknown',
         createResourceId(hortaConfig, 'cognito-backup')
        ]
      : ['--no-backup'];
    const dataRestoreFolder = hortaConfig.hortaRestoreBucket && hortaConfig.hortaRestoreFolder
      ? hortaConfig.hortaRestoreFolder
      : '';
    const restoreArgs:string[] = dataRestoreFolder
      ? ['--restore', restoreBucketName, dataRestoreFolder]
      : ['--no-restore'];
    const systemLogsBackupFolder = hortaConfig.hortaSystemLogsBackupFolder ? hortaConfig.hortaSystemLogsBackupFolder : 'hortacloud/systemlogs';
    const systemLogsBackupArgs:string[] = backupBucketName
        ? [
          backupBucketName,
          systemLogsBackupFolder,
          ]
        : [];
    const mailServerArgs:string[] = hortaConfig.mailServer
      ? [
          '--mail-server',
          hortaConfig.mailServer,
        ]
      : [];
    const mailUserArgs:string[] = hortaConfig.mailUser
      ? [
          '--mail-user',
          hortaConfig.mailUser,
        ]
      : [];
    const mailPasswordArgs:string[] = hortaConfig.mailPassword
      ? [
          '--mail-password',
          hortaConfig.mailPassword,
        ]
      : [];
    const mailSenderArgs:string[] = hortaConfig.mailSender
      ? [
          '--mail-sender',
          hortaConfig.mailSender,
        ]
      : [];
    const mailReceiverArgs:string[] = hortaConfig.mailReceiver
      ? [
          '--mail-receiver',
          hortaConfig.mailReceiver,
        ]
      : [];
    const workstationCacheDirArgs:string[] = hortaConfig.workstationCacheDir
      ? [
          '--workstation_cache_dir',
          hortaConfig.workstationCacheDir,
        ]
      : [];
    const dataAssets = createDataAssets(this, this.server, [
      {
        name: 'BloscLibraries',
        path: '../data/blosc.zip',
      },
    ]);
    const bloscLibArgs = ['--blosc-libs', dataAssets['BloscLibraries'] ];
    createAssets(this, this.server, [
      {
        name: 'InitInstanceAsset',
        path: 'jacs/server-node-init.sh',
        arguments: dataBucketNames
      },
      {
        name: 'CreateLogRotateConfigAsset',
        path: 'jacs/create-logrotate-conf.sh',
        arguments: systemLogsBackupArgs,
      },
      {
        name: 'InitJacsStackAsset',
        path: 'jacs/install-jacs-stack.sh',
        arguments: [
          hortaConfig.hortaCloudAdmin,
          hortaConfig.jwtKey,
          hortaConfig.mongoKey,
          hortaConfig.appPassword,
          hortaConfig.rabbitMQPassword,
          hortaConfig.jacsAPIKey,
          hortaConfig.jadeAPIKey,
          hortaConfig.searchMemGB,
          ...jacsGitBranchArgs,
          ...backupArgs,
          ...restoreArgs,
          ...mailServerArgs,
          ...mailUserArgs,
          ...mailPasswordArgs,
          ...mailSenderArgs,
          ...mailReceiverArgs,
          ...workstationCacheDirArgs,
          ...bloscLibArgs,
          ...dataBucketNames,
        ]
      },
      {
        name: 'CleanupAsset',
        path: 'jacs/cleanup.sh'
      }
    ]);
  }
}

function addRolePolicies(r: Role, policies: PolicyStatement[]): void {
  policies.forEach(p => r.addToPolicy(p));
}

function createSecurityGroup(scope: Construct, vpc: ec2.IVpc, sgRules: SecurityRules[]): ec2.ISecurityGroup {
  const serverSG = new ec2.SecurityGroup(scope, 'server-sg', {
    vpc: vpc,
    allowAllOutbound: true,
  });


  sgRules
    .filter(r => r.port > 0)
    .forEach(r => {
      serverSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(r.port),
        r.description
      );
    })
    ;

  return serverSG;
}

function createJacsMachineImage(cfg: HortaCloudServicesConfig): HortaCloudMachine {
  const jacsMachineImage = ec2.MachineImage.latestAmazonLinux2({
    edition: ec2.AmazonLinuxEdition.STANDARD,
    virtualization: ec2.AmazonLinuxVirt.HVM,
    storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    cpuType: ec2.AmazonLinuxCpuType.X86_64,
  });

  return {
    instanceType: new ec2.InstanceType(cfg.hortaServerInstanceType),
    machineImage: jacsMachineImage,
    keyName: cfg.hortaServerKeyPairName ? cfg.hortaServerKeyPairName : undefined
  };
}

type DataAssets = {[key: string] : string};

function createDataAssets(scope: Construct, instance: ec2.Instance, assetsOpts: AssetOpts[]) : DataAssets {
  const res : DataAssets = {};

  return assetsOpts.map(opts => {
    const asset = new Asset(scope, opts.name, {
      path: path.join(__dirname, opts.path)
    });
    const localPath = instance.userData.addS3DownloadCommand({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
    });
    return {
      name: opts.name,
      path: localPath,
    };
  })
  .reduce((prev, curr) => {
            prev[curr.name] = curr.path;
            return prev;
          }, 
          res);
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

// Common Client/Server Horta Cloud Properties
export interface HortaCloudConfig {
  hortaCloudOrg: string;
  hortaCloudAdmin: string;
  hortaStage: string;
  hortaCloudVersion: string;
  developerName: string;
  hortaWorkstationInstanceType: string;
  hortaWorkstationImageName: string; // the workstation image name and instance type are correlated
}

export interface HortaBackupConfig {
  hortaBackupBucket?: string;
  hortaBackupFolder?: string;
  hortaRestoreBucket?: string;
  hortaRestoreFolder?: string;
  hortaRestoreWorkers: number;
  hortaRestoreParallelCollections: number;
  hortaSystemLogsBackupFolder?: string;
}

export interface VpcInstanceProps {
  vpcId: string;
  privateSubnetIds: string[];
  publicSubnetIds: string[];
}

export function getHortaCloudConfig(): HortaCloudConfig {
  return {
    hortaCloudOrg: process.env.HORTA_ORG || "janelia",
    hortaCloudAdmin: process.env.ADMIN_USER_EMAIL || "horta@test.com",
    hortaStage: process.env.HORTA_STAGE || "dev",
    hortaCloudVersion: "1.0.0",
    developerName: process.env.USER || "unknown",
    hortaWorkstationInstanceType:
      process.env.HORTA_WS_INSTANCE_TYPE || "stream.graphics.g4dn.xlarge",
    hortaWorkstationImageName:
      process.env.HORTA_WS_IMAGE_NAME ||
      "AppStream-Graphics-G4dn-WinServer2022-06-17-2024",
  };
}

export function getHortaBackupConfig(): HortaBackupConfig {
  const hortaRestoreWorkers: number = process.env.HORTA_RESTORE_WORKERS
    ? +process.env.HORTA_RESTORE_WORKERS
    : 0;
  const hortaRestoreParallelCollections: number = process.env
    .HORTA_RESTORE_PARALLEL_COLLECTIONS
    ? +process.env.HORTA_RESTORE_PARALLEL_COLLECTIONS
    : 0;
  return {
    hortaBackupBucket: process.env.HORTA_BACKUP_BUCKET,
    hortaBackupFolder: process.env.HORTA_BACKUP_FOLDER,
    hortaRestoreBucket: process.env.HORTA_RESTORE_BUCKET,
    hortaRestoreFolder: process.env.HORTA_RESTORE_FOLDER,
    hortaRestoreWorkers: hortaRestoreWorkers,
    hortaRestoreParallelCollections: hortaRestoreParallelCollections,
    hortaSystemLogsBackupFolder: process.env.HORTA_SYSTEMLOGS_FOLDER,
  };
}

export function createResourceId(
  cfg: HortaCloudConfig,
  resourceName: string
): string {
  return `${cfg.hortaCloudOrg}-hc-${resourceName}-${cfg.hortaStage}`;
}

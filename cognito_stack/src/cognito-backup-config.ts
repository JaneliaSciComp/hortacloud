import {
  HortaCloudConfig,
  getHortaCloudConfig,
} from "../../common/hortacloud-common";

// Cognito Backup Config
export interface CognitoBackupConfig extends HortaCloudConfig {
  accessibleReadOnlyPoolIds: string[];
}

export function getCognitoBackupConfig(): CognitoBackupConfig {
  const accessibleReadOnlyPoolIds: string[] = process.env.READABLE_POOL_IDS
    ? process.env.READABLE_POOL_IDS.split(",").map((s) => s.trim())
    : [];
  return {
    ...getHortaCloudConfig(),
    accessibleReadOnlyPoolIds: accessibleReadOnlyPoolIds,
  };
}

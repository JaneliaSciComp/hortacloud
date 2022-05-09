// Common Client/Server Horta Cloud Properties
export interface HortaCloudConfig {
    hortaCloudOrg: string;
    hortaCloudAdmin: string;
    hortaStage: string;
    hortaCloudVersion: string;
    developerName: string;
    hortaWorkstationInstanceType: string;
    hortaWorkstationImageName: string; // the workstation image name and instance type are correlated
    restoreCognitoFromBackup: boolean;
}

export interface VpcInstanceProps {
    vpcId: string;
    privateSubnetIds: string[];
    publicSubnetIds: string[];
}

export function getHortaCloudConfig() : HortaCloudConfig {
    return {
        hortaCloudOrg: process.env.HORTA_ORG || 'janelia',
        hortaCloudAdmin: process.env.ADMIN_USER_EMAIL || 'horta@test.com',
        hortaStage: process.env.HORTA_STAGE || 'dev',
        hortaCloudVersion: '1.0.0',
        developerName: process.env.USER || "unknown",
        hortaWorkstationInstanceType: process.env.HORTA_WS_INSTANCE_TYPE || 'stream.graphics.g4dn.xlarge',
        hortaWorkstationImageName: process.env.HORTA_WS_IMAGE_NAME || 'AppStream-Graphics-G4dn-WinServer2019-03-03-2022',
        restoreCognitoFromBackup: process.env.HORTA_RESTORE_COGNITO_FLAG?.toLowerCase() == 'true' ? true : false,
    };
}

export function createResourceId(cfg: HortaCloudConfig, resourceName: string) : string {
    return `${cfg.hortaCloudOrg}-hc-${resourceName}-${cfg.hortaStage}`;
}

// Common Client/Server Horta Cloud Properties
export interface HortaCloudConfig {
    hortaStage: string;
    hortaCloudOrg: string;
    hortaCloudVersion: string;
    developerName: string;
    hortaWorkstationInstanceType: string;
    hortaWorkstationImageName: string; // the workstation image name and instance type are correlated
}

export interface VpcInstanceProps {
    vpcId: string;
    privateSubnetIds: string[];
    publicSubnetIds: string[];
}

export function getHortaCloudConfig() : HortaCloudConfig {
    return {
        hortaCloudOrg: process.env.HORTA_ORG || 'janelia',
        hortaStage: process.env.HORTA_STAGE || 'dev',
        hortaCloudVersion: '1.0.0',
        developerName: process.env.USER || "unknown",
        hortaWorkstationInstanceType: process.env.HORTA_WS_INSTANCE_TYPE || 'stream.graphics.g4dn.xlarge',
        hortaWorkstationImageName: process.env.HORTA_WS_IMAGE_NAME || 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021',
    };
}

export function createResourceId(cfg: HortaCloudConfig, resourceName: string) : string {
    return `${cfg.hortaCloudOrg}-hc-${resourceName}-${cfg.hortaStage}`;
}

// Common Client/Server Horta Cloud Properties
export interface HortaCloudConfig {
    hortaStage: string;
    hortaCloudOrg: string;
    hortaCloudVersion: string;
    developerName: string;
}

export function getHortaCloudConfig() : HortaCloudConfig {
    return {
        hortaCloudOrg: process.env.HORTA_ORG || 'janelia',
        hortaStage: process.env.HORTA_STAGE || 'dev',
        hortaCloudVersion: '1.0.0',
        developerName: process.env.USER || "unknown",
    };
}

export function createResourceId(cfg: HortaCloudConfig, resourceName: string) : string {
    return `${cfg.hortaCloudOrg}-hc-${resourceName}-${cfg.hortaStage}`;
}

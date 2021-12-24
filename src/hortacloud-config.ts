import * as crypto from 'crypto';

// Common Client/Server Horta Cloud Properties
export interface HortaCloudConfig {
    hortaStage: string;
    hortaCloudOrg: string;
    hortaCloudVersion: string;
    developerName: string;
}

// Horta Services Config
export interface HortaCloudServicesConfig extends HortaCloudConfig {
    hortaServerInstanceType: string;
    hortaServerKeyPairName?: string;
    hortaDataVolumeSizeGB: number;
    withPublicAccess?: true;
    jwtKey: string;
    mongoKey: string;
    appPassword: string;
    rabbitMQPassword: string;
    jacsAPIKey: string;
    jadeAPIKey: string;
    searchMemGB: string;
}

export function getHortaCloudConfig() : HortaCloudConfig {
    return {
        hortaCloudOrg: process.env.HORTA_ORG || 'janelia',
        hortaStage: process.env.HORTA_STAGE || 'cgdev',
        hortaCloudVersion: '1.0.0',
        developerName: process.env.USER || "unknown",
    };
}

export function getHortaServicesConfig() : HortaCloudServicesConfig {
    return {
        ...getHortaCloudConfig(),
        hortaServerInstanceType: process.env.HORTA_SERVER_INSTANCE_TYPE || 't2.xlarge',
        hortaServerKeyPairName: process.env.HORTA_KEY_PAIR || 'ec2_batch',
        hortaDataVolumeSizeGB: 30,
        withPublicAccess: true,
        jwtKey: process.env.JACS_JWT_KEY || crypto.randomBytes(32).toString('hex'),
        mongoKey: process.env.JACS_MONGO_KEY || crypto.randomBytes(32).toString('hex'),
        appPassword: process.env.JACS_APP_PASSWD || crypto.randomBytes(16).toString('hex'),
        rabbitMQPassword: process.env.RABBITMQ_PASSWD || crypto.randomBytes(16).toString('hex'),
        jacsAPIKey: process.env.JACS_API_KEY || crypto.randomBytes(16).toString('hex'),
        jadeAPIKey: process.env.JADE_API_KEY || crypto.randomBytes(16).toString('hex'),
        searchMemGB: process.env.SEARCH_MEM_SIZE || "1"
    };
}

export function createResourceId(cfg: HortaCloudConfig, resourceName: string) : string {
    return `${cfg.hortaCloudOrg}-hc-${resourceName}-${cfg.hortaStage}`;
}

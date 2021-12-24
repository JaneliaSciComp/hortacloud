import * as crypto from 'crypto';

const stage = process.env.HORTA_STAGE
    ? process.env.HORTA_STAGE
    : 'cgdev';
const version = '1.0.0';
const serverInstanceType = process.env.HORTA_SERVER_INSTANCE_TYPE 
    ? process.env.HORTA_SERVER_INSTANCE_TYPE
    : 't2.xlarge';
const serverKeyPairName = process.env.HORTA_KEY_PAIR 
    ? process.env.HORTA_KEY_PAIR
    : 'ec2_batch';
const hortaCloudOrg = process.env.HORTA_ORG
    ? process.env.HORTA_ORG
    : 'janelia';
const jwtKey = process.env.JACS_JWT_KEY
    ? process.env.JACS_JWT_KEY
    : crypto.randomBytes(32).toString('hex');
const mongoKey = process.env.JACS_MONGO_KEY
    ? process.env.JACS_MONGO_KEY
    : crypto.randomBytes(32).toString('hex');
const appPassword = process.env.JACS_APP_PASSWD
    ? process.env.JACS_APP_PASSWD
    : crypto.randomBytes(16).toString('hex');
const rabbitMQPassword = process.env.RABBITMQ_PASSWD
    ? process.env.RABBITMQ_PASSWD
    : crypto.randomBytes(16).toString('hex');
const jacsAPIKey = process.env.JACS_API_KEY
    ? process.env.JACS_API_KEY
    : crypto.randomBytes(16).toString('hex');
const jadeAPIKey = process.env.JADE_API_KEY
    ? process.env.JADE_API_KEY
    : crypto.randomBytes(16).toString('hex');
const searchMemGB = process.env.SEARCH_MEM_SIZE
    ? process.env.SEARCH_MEM_SIZE
    : "1"

export interface HortaCloudConfig {
    hortaStage: string;
    hortaCloudOrg: string;
    hortaCloudVersion: string;
    developerName: string;
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

export function getHortaConfig() : HortaCloudConfig {
    return {
        hortaCloudOrg: hortaCloudOrg,
        hortaStage: stage,
        hortaCloudVersion: version,
        developerName: process.env.USER || "unknown",
        hortaServerInstanceType: serverInstanceType,
        hortaServerKeyPairName: serverKeyPairName,
        hortaDataVolumeSizeGB: 30,
        withPublicAccess: true,
        jwtKey: jwtKey,
        mongoKey: mongoKey,
        appPassword: appPassword,
        rabbitMQPassword: rabbitMQPassword,
        jacsAPIKey: jacsAPIKey,
        jadeAPIKey: jadeAPIKey,
        searchMemGB: searchMemGB
    };
}

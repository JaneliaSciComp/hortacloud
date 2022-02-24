import * as crypto from 'crypto';

import { HortaCloudConfig, getHortaCloudConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudServicesConfig extends HortaCloudConfig {
    hortaServerInstanceType: string;
    hortaServerKeyPairName?: string;
    hortaDataVolumeSizeGB: number;
    withPublicAccess?: boolean;
    jwtKey: string;
    mongoKey: string;
    appPassword: string;
    rabbitMQPassword: string;
    jacsAPIKey: string;
    jadeAPIKey: string;
    searchMemGB: string;
    hortaDataBuckets?: string;
}

export function getHortaServicesConfig() : HortaCloudServicesConfig {
    return {
        ...getHortaCloudConfig(),
        hortaServerInstanceType: process.env.HORTA_SERVER_INSTANCE_TYPE || 't2.xlarge',
        hortaServerKeyPairName: process.env.HORTA_KEY_PAIR || '',
        hortaDataVolumeSizeGB: 30,
        withPublicAccess: false,
        jwtKey: process.env.JACS_JWT_KEY || crypto.randomBytes(32).toString('hex'),
        mongoKey: process.env.JACS_MONGO_KEY || crypto.randomBytes(32).toString('hex'),
        appPassword: process.env.JACS_APP_PASSWD || crypto.randomBytes(16).toString('hex'),
        rabbitMQPassword: process.env.RABBITMQ_PASSWD || crypto.randomBytes(16).toString('hex'),
        jacsAPIKey: process.env.JACS_API_KEY || crypto.randomBytes(16).toString('hex'),
        jadeAPIKey: process.env.JADE_API_KEY || crypto.randomBytes(16).toString('hex'),
        searchMemGB: process.env.SEARCH_MEM_SIZE || '1',
        hortaDataBuckets: process.env.HORTA_DATA_BUCKETS || 'janelia-mouselight-imagery',
    };
}

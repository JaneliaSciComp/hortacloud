import { HortaCloudConfig, getHortaCloudConfig,
         HortaBackupConfig, getHortaBackupConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudServicesConfig extends HortaCloudConfig, HortaBackupConfig {
    hortaServerInstanceType: string;
    hortaServerKeyPairName?: string;
    hortaDataVolumeSizeGB: number;
    jacssGitBranch?: string;
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
        ...getHortaBackupConfig(),
        hortaServerInstanceType: process.env.HORTA_SERVER_INSTANCE_TYPE || 't2.xlarge',
        hortaServerKeyPairName: process.env.HORTA_KEY_PAIR || '',
        hortaDataVolumeSizeGB: 30,
        jacssGitBranch: process.env.JACS_GIT_BRANCH,
        withPublicAccess: false,
        jwtKey: process.env.JACS_JWT_KEY || 'GFNaVyaC6boqf0VKtBEjLLu5VY8Ks0PQ23kpSs8lgWg',
        mongoKey: process.env.JACS_MONGO_KEY || 'C9w7ZIVbtvN4LqDgOUrZuLEOqGSkgjWvRDg4mpgDw',
        appPassword: process.env.JACS_APP_PASSWD || 'changeJacsPasswdInenv',
        rabbitMQPassword: process.env.RABBITMQ_PASSWD || 'changeRabbitPasswdInenv',
        jacsAPIKey: process.env.JACS_API_KEY || 'changeJacsAPIKeyInenv',
        jadeAPIKey: process.env.JADE_API_KEY || 'changeJadeAPIKeyInenv',
        searchMemGB: process.env.SEARCH_MEM_SIZE || '1',
        hortaDataBuckets: process.env.HORTA_DATA_BUCKETS,
    };
}

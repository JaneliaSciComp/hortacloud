import { HortaCloudConfig, getHortaCloudConfig,
         HortaBackupConfig, getHortaBackupConfig } from '../../common/hortacloud-common';

const defaultJacsStackVersion = '9.24';

// Horta Services Config
export interface HortaCloudServicesConfig extends HortaCloudConfig, HortaBackupConfig {
    hortaServerInstanceType: string;
    hortaServerKeyPairName?: string;
    hortaSystemVolumeSizeGB: number;
    hortaDataVolumeSizeGB: number;
    jacsGitBranch?: string;
    withPublicAccess?: boolean;
    jwtKey: string;
    mongoKey: string;
    appPassword: string;
    rabbitMQPassword: string;
    jacsAPIKey: string;
    jadeAPIKey: string;
    searchMemGB: string;
    hortaDataBuckets?: string;
    mailServer?: string;
    mailUser?: string;
    mailPassword?: string;
    mailSender?: string;
    mailReceiver?: string;
    workstationCacheDir?: string;
}

export function getHortaServicesConfig() : HortaCloudServicesConfig {
    const hortaSystemVolumeSizeGB:number = process.env.HORTA_SERVER_SYSTEM_VOLSIZE_GB
        ? +process.env.HORTA_SERVER_SYSTEM_VOLSIZE_GB
        : 8;
    const hortaDataVolumeSizeGB:number = process.env.HORTA_SERVER_DATA_VOLSIZE_GB
        ? +process.env.HORTA_SERVER_DATA_VOLSIZE_GB
        : 30;
    return {
        ...getHortaCloudConfig(),
        ...getHortaBackupConfig(),
        hortaServerInstanceType: process.env.HORTA_SERVER_INSTANCE_TYPE || 'r5n.2xlarge',
        hortaServerKeyPairName: process.env.HORTA_KEY_PAIR || '',
        hortaSystemVolumeSizeGB: hortaSystemVolumeSizeGB,
        hortaDataVolumeSizeGB: hortaDataVolumeSizeGB,
        jacsGitBranch: process.env.JACS_GIT_BRANCH || defaultJacsStackVersion,
        withPublicAccess: false,
        jwtKey: process.env.JACS_JWT_KEY || 'GFNaVyaC6boqf0VKtBEjLLu5VY8Ks0PQ23kpSs8lgWg',
        mongoKey: process.env.JACS_MONGO_KEY || 'C9w7ZIVbtvN4LqDgOUrZuLEOqGSkgjWvRDg4mpgDw',
        appPassword: process.env.JACS_APP_PASSWD || 'changeJacsPasswdInenv',
        rabbitMQPassword: process.env.RABBITMQ_PASSWD || 'changeRabbitPasswdInenv',
        jacsAPIKey: process.env.JACS_API_KEY || 'changeJacsAPIKeyInenv',
        jadeAPIKey: process.env.JADE_API_KEY || 'changeJadeAPIKeyInenv',
        searchMemGB: process.env.SEARCH_MEM_SIZE || '1',
        hortaDataBuckets: process.env.HORTA_DATA_BUCKETS,
        mailServer: process.env.MAIL_SERVER,
        mailUser: process.env.MAIL_USER,
        mailPassword: process.env.MAIL_PASSWORD,
        mailSender: process.env.MAIL_SENDER,
        mailReceiver: process.env.MAIL_RECEIVER,
        workstationCacheDir: process.env.WORKSTATION_CACHE_DIR,
    };
}

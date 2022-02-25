import { HortaCloudConfig, getHortaCloudConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudAppstreamConfig extends HortaCloudConfig {
    appstreamComputeCapacity: number;
    sessionDurationInMin: number;
}

export function getHortaAppstreamConfig() : HortaCloudAppstreamConfig {
    return {
        ...getHortaCloudConfig(),
        appstreamComputeCapacity: parseInt(process.env.HORTA_APPSTREAM_FLEET_INSTANCES || '5'),
        sessionDurationInMin: parseInt(process.env.HORTA_SESSION_DURATION_IN_MINS || '960')
    };
}

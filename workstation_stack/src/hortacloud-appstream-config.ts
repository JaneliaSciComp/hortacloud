import { HortaCloudConfig, getHortaCloudConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudAppstreamConfig extends HortaCloudConfig {
    appstreamComputeCapacity: number;
    sessionDisconnectInSecs: number;
    sessionDurationInMin: number;
}

export function getHortaAppstreamConfig() : HortaCloudAppstreamConfig {
    return {
        ...getHortaCloudConfig(),
        appstreamComputeCapacity: parseInt(process.env.HORTA_APPSTREAM_FLEET_INSTANCES || '5'),
        sessionDisconnectInSecs: parseInt(process.env.HORTA_SESSION_DISCONNECT_IN_SECS || '300'),
        sessionDurationInMin: parseInt(process.env.HORTA_SESSION_DURATION_IN_MINS || '960')
    };
}

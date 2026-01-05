import { HortaCloudConfig, getHortaCloudConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudAppstreamConfig extends HortaCloudConfig {
    googleDomains: string[];
    oneDriveDomains: string[];
    appstreamComputeCapacity: number;
    sessionDisconnectInSecs: number;
    sessionDurationInMin: number;
    sessionIdleDisconnectInMin: number;
    awsRegion: string;
    enableDcvLatency: boolean;
}

export function getHortaAppstreamConfig() : HortaCloudAppstreamConfig {
    const googleDomains:string[] = process.env.HORTA_GOOGLE_DOMAINS
        ? process.env.HORTA_GOOGLE_DOMAINS.split(',')
        : []
    const oneDriveDomains:string[] = process.env.HORTA_ONE_DRIVE_DOMAINS
        ? process.env.HORTA_ONE_DRIVE_DOMAINS.split(',')
        : []
    return {
        ...getHortaCloudConfig(),
        googleDomains: googleDomains,
        oneDriveDomains: oneDriveDomains,
        appstreamComputeCapacity: parseInt(process.env.HORTA_APPSTREAM_FLEET_INSTANCES || '5'),
        sessionDisconnectInSecs: parseInt(process.env.HORTA_SESSION_DISCONNECT_IN_SECS || '600'),
        sessionDurationInMin: parseInt(process.env.HORTA_SESSION_DURATION_IN_MINS || '960'),
        sessionIdleDisconnectInMin: parseInt(process.env.HORTA_SESSION_IDLE_DISCONNECT_IN_MINS || '5'),
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        enableDcvLatency:
            (process.env.HORTA_ENABLE_DCV_LATENCY || 'false').toLowerCase() === 'true',
    };
}

import { HortaCloudConfig, getHortaCloudConfig } from '../../common/hortacloud-common';

// Horta Services Config
export interface HortaCloudAppstreamConfig extends HortaCloudConfig {
    appStreamWithInternetAccess: boolean,
    googleDomains: string[];
    oneDriveDomains: string[];
    appstreamComputeCapacity: number;
    sessionDisconnectInSecs: number;
    sessionDurationInMin: number;
}

export function getHortaAppstreamConfig() : HortaCloudAppstreamConfig {
    const withInternet = (process.env.HORTA_APPSTREAM_WITH_INTERNET || 'false').toLowerCase();
    const googleDomains:string[] = process.env.HORTA_GOOGLE_DOMAINS 
        ? process.env.HORTA_GOOGLE_DOMAINS.split(',')
        : []
    const oneDriveDomains:string[] = process.env.HORTA_ONE_DRIVE_DOMAINS 
        ? process.env.HORTA_ONE_DRIVE_DOMAINS.split(',')
        : []
    return {
        ...getHortaCloudConfig(),
        appStreamWithInternetAccess: withInternet === 'true' || googleDomains.length > 0 || oneDriveDomains.length > 0,
        googleDomains: googleDomains,
        oneDriveDomains: oneDriveDomains,
        appstreamComputeCapacity: parseInt(process.env.HORTA_APPSTREAM_FLEET_INSTANCES || '5'),
        sessionDisconnectInSecs: parseInt(process.env.HORTA_SESSION_DISCONNECT_IN_SECS || '600'),
        sessionDurationInMin: parseInt(process.env.HORTA_SESSION_DURATION_IN_MINS || '960')
    };
}

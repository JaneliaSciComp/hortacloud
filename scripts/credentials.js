const { IAM } = require("@aws-sdk/client-iam");
const { STS } = require("@aws-sdk/client-sts");
const prompts = require('prompts');

async function getMFADevice(region, userName)  {
    const iam = new IAM({
        region
    });
    const mfaDeviceResponse = await iam.listMFADevices({
        UserName:  userName
    });
    if (mfaDeviceResponse.MFADevices && mfaDeviceResponse.MFADevices.length > 0) {
        return mfaDeviceResponse.MFADevices[0].SerialNumber;
    } else {
        return null;
    }
}

async function getSessionToken(region, mfaDevice, code) {
    const sessionTokenParams = {
        DurationSeconds: 28800, // 8hours
        SerialNumber: mfaDevice,
        TokenCode: code
    };
    const sts = new STS({
        region
    })
    const sessionTokenResponse = await sts.getSessionToken(sessionTokenParams);
    return sessionTokenResponse.Credentials;
}

async function getSessionnCredentials(region, userName, mfaEnabled) {
    if (mfaEnabled) {
        const mfaDevice = await getMFADevice(region, userName);
        if (mfaDevice) {
            var mfaDeviceName = mfaDevice.split(/\//).pop();
            const tokenResponse = await prompts({
                type: 'text',
                name: 'token',
                message: `Enter code from ${mfaDeviceName}`,
            });
            return await getSessionToken(region, mfaDevice, tokenResponse.token);
        } else {
            return {};
        }
    } else {
        return {};
    }
}

function getEnvWithSessionCredentials(credentials) {
    if (credentials && credentials.SessionToken) {
        return {
            AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
            AWS_SESSION_TOKEN: credentials.SessionToken,
            ...process.env,
        }
    } else {
        return process.env
    }
}

module.exports = {
    getSessionnCredentials,
    getEnvWithSessionCredentials,
};

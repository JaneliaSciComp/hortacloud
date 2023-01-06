const { IAM, STS, CloudFormation } = require('aws-sdk');
const prompts = require('prompts');

async function getMFADevice(region)  {
    const iam = new IAM({
        region
    });
    const mfaDeviceResponse = await iam.listMFADevices().promise();
    return mfaDeviceResponse.MFADevices[0].SerialNumber;
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
    const sessionTokenResponse = await sts.getSessionToken(sessionTokenParams).promise();
    return sessionTokenResponse.Credentials;
}

async function getSessionnCredentials(region, mfaEnabled) {
  if (mfaEnabled) {
    const mfaDevice = await getMFADevice(region);
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
}

function getEnvWithSessionCredentials(credentials) {
    if (credentials.SessionToken) {
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

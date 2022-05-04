import { Construct } from 'constructs';
import { AssetCode, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

import * as path from 'path';

import { getHortaServicesConfig } from './hortacloud-services-config';
import { createResourceId } from '../../common/hortacloud-common';

const { AWS_ACCOUNT, AWS_REGION } = process.env;

export class HortaCloudCognitoBackup extends Construct {

    public readonly backupHandler: Function;
    public readonly restoreHandler: Function;

    constructor(scope: Construct,
                id: string,
                userPoolId: string) {
        super(scope, id);

        const hortaConfig = getHortaServicesConfig();

        this.backupHandler = new NodejsFunction(this, 'BackupHandler', {
            runtime: Runtime.NODEJS_14_X,
            entry: path.join(__dirname, 'backuputils', 'cognito_backup_tools.ts'),
            handler: 'cognitoExport',
            functionName: createResourceId(hortaConfig, 'cognito-backup'),
            projectRoot: __dirname
        });

        this.backupHandler.addToRolePolicy(
            new PolicyStatement({
                actions: [ 'cognito-idp:ListUsers' ],
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT}:userpool/${userPoolId}`
                ]
            })
        );

        this.restoreHandler = new Function(this, 'RestoreHandler', {
            runtime: Runtime.NODEJS_14_X,
            code: new AssetCode(path.join(__dirname, "backuputils")),
            handler: 'cognito_backup_tools.cognitoExport', // !!! FIXME !!!!!!
            functionName: createResourceId(hortaConfig, 'cognito-restore'),
        });

    }

}

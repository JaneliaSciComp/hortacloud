import { Construct } from 'constructs';
import { Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

import * as path from 'path';

import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';
import { Duration } from 'aws-cdk-lib';

const { AWS_ACCOUNT, AWS_REGION } = process.env;

export class HortaCloudCognitoBackup extends Construct {

    public readonly backupHandler: Function;
    public readonly restoreHandler: Function;

    constructor(scope: Construct,
                id: string,
                userPoolId: string) {
        super(scope, id);

        const hortaConfig = getHortaCloudConfig();

        const cognitoBackupResourcesDir = path.join(__dirname, 'cognito-backup-resources');

        this.backupHandler = new NodejsFunction(this, 'BackupHandler', {
            runtime: Runtime.NODEJS_14_X,
            entry: path.join(cognitoBackupResourcesDir, 'index.ts'),
            handler: 'cognitoExport',
            functionName: createResourceId(hortaConfig, 'cognito-backup'),
            environment: {
                COGNITO_POOL_ID: userPoolId
            },
            projectRoot: cognitoBackupResourcesDir,
            depsLockFilePath: path.join(cognitoBackupResourcesDir, 'package-lock.json'),
            timeout: Duration.minutes(15), // give it the maximum timeout for now
        });

        this.addPolicies(this.backupHandler, [
            new PolicyStatement({
                actions: [ 
                    'cognito-idp:ListUsers', 
                    'cognito-idp:ListGroups',
                    'cognito-idp:AdminListGroupsForUser'
                ],
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT}:userpool/${userPoolId}`
                ]
            }),
            new PolicyStatement({
                actions: [
                    's3:PutObject'
                ],
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:s3:::*/`,
                    `arn:aws:s3:::*/*`
                ]
            })
        ]);

        this.restoreHandler = new NodejsFunction(this, 'RestoreHandler', {
            runtime: Runtime.NODEJS_14_X,
            entry: path.join(cognitoBackupResourcesDir, 'index.ts'),
            handler: 'cognitoImport',
            functionName: createResourceId(hortaConfig, 'cognito-restore'),
            environment: {
                COGNITO_POOL_ID: userPoolId
            },
            projectRoot: cognitoBackupResourcesDir,
            depsLockFilePath: path.join(cognitoBackupResourcesDir, 'package-lock.json'),
            timeout: Duration.minutes(15), // give it the maximum timeout for now
        });

        this.addPolicies(this.restoreHandler, [
            new PolicyStatement({
                actions: [
                    's3:GetObject'
                ],
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:s3:::*/`,
                    `arn:aws:s3:::*/*`
                ]
            })
        ]);

    }

    addPolicies(f: Function, policies: PolicyStatement[]) : void {
        policies.forEach(p => f.addToRolePolicy(p));
    }
}

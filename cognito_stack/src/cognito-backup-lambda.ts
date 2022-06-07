import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
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
                defaultUserPoolId: string,
                additionalReadOnlyUserPoolId: string[]) {
        super(scope, id);

        const hortaConfig = getHortaCloudConfig();

        const cognitoBackupResourcesDir = path.join(__dirname, 'cognito-backup-resources');

        this.backupHandler = new Function(this, 'BackupHandler', {
            runtime: Runtime.NODEJS_14_X,
            code: Code.fromAsset(cognitoBackupResourcesDir),
            handler: 'index.cognitoExport',
            functionName: createResourceId(hortaConfig, 'cognito-backup'),
            environment: {
                DEFAULT_POOL_ID: defaultUserPoolId
            },
            timeout: Duration.minutes(15), // give it the maximum timeout for now
        });

        const readablePoolARNs: string[] = [
            defaultUserPoolId,
            ...additionalReadOnlyUserPoolId,
        ].map(pId => `arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT}:userpool/${pId}`);

        this.addPolicies(this.backupHandler, [
            new PolicyStatement({
                actions: [
                    'cognito-idp:ListUsers', 
                    'cognito-idp:ListGroups',
                    'cognito-idp:AdminListGroupsForUser'
                ],
                effect: Effect.ALLOW,
                resources: readablePoolARNs,
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

        this.restoreHandler = new Function(this, 'RestoreHandler', {
            runtime: Runtime.NODEJS_14_X,
            code: Code.fromAsset(cognitoBackupResourcesDir),
            handler: 'index.cognitoImport',
            functionName: createResourceId(hortaConfig, 'cognito-restore'),
            environment: {
                DEFAULT_POOL_ID: defaultUserPoolId
            },
            timeout: Duration.minutes(15), // give it the maximum timeout for now
        });

        this.addPolicies(this.restoreHandler, [
            new PolicyStatement({
                actions: [
                    'cognito-idp:AdminCreateUser', 
                    'cognito-idp:CreateGroup',
                    'cognito-idp:AdminAddUserToGroup'
                ],
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT}:userpool/${defaultUserPoolId}`
                ]
            }),
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

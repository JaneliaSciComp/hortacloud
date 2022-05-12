import * as cdk from 'aws-cdk-lib';
import { IUserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { getHortaCloudConfig } from '../../common/hortacloud-common';


export class AdminApiCognitoClient extends Construct {
  public readonly userPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, userPool: IUserPool) {
    super(scope, id);

    // this generates the clientId that will be used by the admin site
    this.userPoolClient = new UserPoolClient(
      this,
      'AdminUserPoolClient',
      {
        userPool: userPool
      }
    );
  }
}

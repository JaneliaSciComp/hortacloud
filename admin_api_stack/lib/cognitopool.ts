import * as cdk from 'aws-cdk-lib';
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

const adminGroupName = 'admins';

export class CognitoPool extends Construct {
  public readonly pool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.pool = new cognito.UserPool(this, 'HortaCloudUsers', {
      selfSignUpEnabled: false,
      signInCaseSensitive: false,
      signInAliases: {
        username: true,
        email: false
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        }
      },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // this generates the clientId that will be used by the admin site
    this.userPoolClient = new cognito.UserPoolClient(this, "AdminUserPoolClient", {
      userPool: this.pool
    });

    // add the admins group
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminsUserPoolGroup', {
      userPoolId: this.pool.userPoolId,
      // the properties below are optional
      description: 'Adminsitrative users',
      groupName: adminGroupName,
      precedence: 0,
      // roleArn: 'roleArn',
    });

    if (process.env.ADMIN_USER_EMAIL) {

      // add the default admin user for first access.
      const adminUser = new cognito.CfnUserPoolUser(this, 'DefaultAdminUserPoolUser', {
        userPoolId: this.pool.userPoolId,
        // the properties below are optional
        username: process.env.ADMIN_USER_EMAIL,
        userAttributes: [
          {
            name: 'email',
            value: process.env.ADMIN_USER_EMAIL
          },
          {
            name: 'email_verified',
            value: 'True'
          },
        ]
      });

      const attachAdminUser = new cognito.CfnUserPoolUserToGroupAttachment(this, 'AdminUsertoAdminGroupAttachment', {
        groupName: adminGroupName,
        username: process.env.ADMIN_USER_EMAIL,
        userPoolId: this.pool.userPoolId,
      });

      // need to make sure the admin user has been created, before
      // adding it to the admin group. This dependency makes sure
      // that happens.
      attachAdminUser.node.addDependency(adminUser);

    } else {
      throw new Error('ADMIN_USER_EMAIL must be specified');
    }

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.pool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId
    });
  }
}
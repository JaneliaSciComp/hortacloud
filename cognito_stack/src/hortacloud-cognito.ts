import { Construct } from 'constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { AccountRecovery, CfnUserPoolGroup,
         CfnUserPoolUser, CfnUserPoolUserToGroupAttachment,
         UserPool
       } from 'aws-cdk-lib/aws-cognito';
import { createResourceId, getHortaCloudConfig } from '../../common/hortacloud-common';
import { HortaCloudCognitoBackup } from './cognito-backup-lambda';

export class HortaCloudCognitoStack extends Stack {

  public readonly cognito: HortaCloudCognito;
  public readonly cognitoBackup: HortaCloudCognitoBackup;

  constructor(scope: Construct,
    id: string,
    props?: StackProps) {
    super(scope, id, props);

    this.cognito = new HortaCloudCognito(this, 'Cognito');
    this.cognitoBackup = new HortaCloudCognitoBackup(this, 'CognitoBackup', this.cognito.userPool.userPoolId);
  }
}

const ADMIN_GROUP_NAME = "admins";

class HortaCloudCognito extends Construct {

  public readonly userPool: UserPool;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    const hortaCloudConfig = getHortaCloudConfig();

    const adminBucketUrl = `${hortaCloudConfig.hortaCloudOrg}-hc-webadmin-${hortaCloudConfig.hortaStage}.s3-website-${process.env.AWS_REGION}.amazonaws.com`;
    // user pool for auth
    this.userPool = new UserPool(this, "HortaCloudUsers", {
      selfSignUpEnabled: false,
      signInCaseSensitive: false,
      signInAliases: {
        username: true,
        email: false
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false
        }
      },
      // TODO: change the fromEmail address to a less opaque domain name.
      // The no-reply@verificationemail.com domain does not inspire confidence.
      userInvitation: {
        emailSubject: "Your temporary janeliaHortaCloud password",
        emailBody: `Dear {username}, you have been invited to join Janelia's HortaCloud service. <br/>
        Your temporary password is {####}<br/>
        Please login at ${adminBucketUrl} to change your password and access the service.`
      },
      autoVerify: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userPoolName: createResourceId(hortaCloudConfig, 'UserPool'),
    });

    if (!hortaCloudConfig.restoreCognitoFromBackup) {
      if (!process.env.ADMIN_USER_EMAIL) {
        throw new Error("Admin user must be set");
      }
      // add the admins group
      const adminGroup = new CfnUserPoolGroup(this, 'AdminsUserPoolGroup', {
          userPoolId: this.userPool.userPoolId,
          // the properties below are optional
          description: "Adminsitrative users",
          groupName: ADMIN_GROUP_NAME,
          precedence: 0,
        }
      );
      // add the default admin user for first access.
      const adminUser = new CfnUserPoolUser(this, 'DefaultAdminUserPoolUser', {
          userPoolId: this.userPool.userPoolId,
          // the properties below are optional
          username: process.env.ADMIN_USER_EMAIL,
          userAttributes: [
            {
              name: "email",
              value: process.env.ADMIN_USER_EMAIL
            },
            {
              name: "email_verified",
              value: "True"
            }
          ]
        }
      );

      // add admin user to the admins group
      const addAdminUserToAdminsGroup = new CfnUserPoolUserToGroupAttachment(this, "AdminUsertoAdminGroupAttachment", {
          groupName: ADMIN_GROUP_NAME,
          username: process.env.ADMIN_USER_EMAIL,
          userPoolId: this.userPool.userPoolId,
        }
      );

      // need to make sure the admin user has been created,
      // before adding it to the admin group.
      addAdminUserToAdminsGroup.node.addDependency(adminUser);
    }

    // export user pool
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: createResourceId(hortaCloudConfig, 'UserPoolId')
    });
  }

}
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { getHortaCloudConfig } from "../../common/hortacloud-common";


export class CognitoPool extends Construct {
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const props = getHortaCloudConfig();

    // this generates the clientId that will be used by the admin site
    this.userPoolClient = new cognito.UserPoolClient(
      this,
      "AdminUserPoolClient",
      {
        userPool: this.pool
      }
    );

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId
    });
  }
}

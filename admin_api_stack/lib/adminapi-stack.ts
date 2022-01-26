import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as adminLambda from "./admin_lambda";
import * as cognitoPool from "./cognitopool";

interface AdminAPIStackProps extends cdk.StackProps {
  stage: string;
  org: string;
}

export class HortaCloudAdminAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminAPIStackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    // user pool for auth
    const hortaCloudCognitoPool = new cognitoPool.CognitoPool(
      this,
      "CognitoPool"
    );

    new cdk.CfnOutput(this, "UserPoolId", {
      value: hortaCloudCognitoPool.pool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: hortaCloudCognitoPool.userPoolClient.userPoolClientId
    });

    // upload the lambda function
    const adminLambdaConstruct = new adminLambda.LambdaService(
      this,
      "Lambdas",
      hortaCloudCognitoPool.pool
    );

    new cdk.CfnOutput(this, "ApiGatewayEndPoint", {
      value: adminLambdaConstruct.api.url
    });

  }
}

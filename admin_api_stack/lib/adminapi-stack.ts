import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaService } from "./admin-lambda";
import { UserPool, UserPoolOperation } from "aws-cdk-lib/aws-cognito";
import { AdminApiCognitoClient } from "./adminapi-cognito-client";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";

interface AdminAPIStackProps extends StackProps {
  stage: string;
  org: string;
  userPoolId: string;
}

export class HortaCloudAdminAPIStack extends Stack {
  public readonly adminLambdaConstruct: LambdaService;

  constructor(scope: Construct, id: string, props: AdminAPIStackProps) {
    super(scope, id, props);

    const userPool = UserPool.fromUserPoolId(
      this,
      "UserPoolId",
      props.userPoolId
    );

    // user pool for auth
    const adminApiCognitoClient = new AdminApiCognitoClient(
      this,
      `${props.org}-CognitoPool-${props.stage}`,
      userPool
      );

    // upload the lambda function
    const adminLambdaConstruct = new LambdaService(this, "Lambdas", userPool, {
      org: props.org,
      stage: props.stage,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: adminApiCognitoClient.userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "ApiGatewayEndPoint", {
      value: adminLambdaConstruct.api.url,
      exportName: `${props.org}-hc-ApiGatewayEndPoint-${props.stage}` 
      });

  }
}

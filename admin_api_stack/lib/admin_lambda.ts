import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";

interface LambaServiceProps {
  org: string;
  stage: string;
}

export class LambdaService extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, userPool: cognito.UserPool, props: LambaServiceProps) {
    super(scope, id);

    // set up api gateway
    this.api = new apigateway.RestApi(this, `${props.org}-horta-cloud-admin-lambda-api-${props.stage}`, {
      restApiName: `Horta Cloud Admin Service - ${props.org} ${props.stage}`,
      description: `Admin service to manage users & generate app stream urls for ${props.org} ${props.stage}`
    });

    // set up authorizer to use cognito pools
    const authorizer = new apigateway.CfnAuthorizer(this, "cfnAuth", {
      restApiId: this.api.restApiId,
      name: "HortaCloudAPIAuthorizer",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.Authorization",
      providerArns: [userPool.userPoolArn]
    });

    // add the /auth resource
    const authHandler = new lambda.Function(this, "HortaCloudAuthHandler", {
      runtime: lambda.Runtime.NODEJS_14_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("appstream_lambda_resources"),
      handler: "index.handler",
      environment: {
        // "Workstation9Fleet",
        FLEETNAME: cdk.Fn.importValue(`${props.org}-hc-FleetID-${props.stage}`),
        // "JaneliaWorkstation3"
        STACKNAME: cdk.Fn.importValue(`${props.org}-hc-StackID-${props.stage}`),
      }
    });

    authHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appstream:CreateStreamingURL"],
        effect: iam.Effect.ALLOW,
        resources: [
          "arn:aws:appstream:us-east-1:777794738451:fleet/Workstation9Fleet",
          "arn:aws:appstream:us-east-1:777794738451:stack/JaneliaWorkstation3"
        ]
      })
    );

    const authIntegration = new apigateway.LambdaIntegration(authHandler, {});

    const auth = this.api.root.addResource("auth");

    auth.addMethod("POST", authIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });

    auth.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["POST", "OPTIONS"]
    });

    // add the /user-list resource
    const userListHandler = new lambda.Function(
      this,
      "HortaCloudUserListHandler",
      {
        runtime: lambda.Runtime.NODEJS_14_X, // So we can use async in widget.js
        code: lambda.Code.fromAsset(path.join(__dirname, "..", "user_list_resources")),
        handler: "index.handler",
        environment: {
          GROUP: "admins",
          USERPOOL: userPool.userPoolId
        }
      }
    );

    userListHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetRandomPassword"],
        effect: iam.Effect.ALLOW,
        resources: ["*"]
      })
    );
    userListHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:ListUsersInGroup",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:ListUsers",
          "cognito-idp:ListGroups",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser"
        ],
        effect: iam.Effect.ALLOW,
        resources: [userPool.userPoolArn]
      })
    );

    const userListIntegration = new apigateway.LambdaIntegration(
      userListHandler,
      {}
    );

    const userList = this.api.root.addResource("user-list");
    userList.addMethod("GET", userListIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
    userList.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"]
    });

    // add the /{proxy+} resource
    const proxyIntegration = new apigateway.LambdaIntegration(
      userListHandler,
      {}
    );

    const proxy = this.api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(userListHandler),

      // "false" will require explicitly adding methods on the `proxy` resource
      anyMethod: false // "true" is the default
    });
    proxy.addMethod("ANY", proxyIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });

    proxy.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS
    });
  }
}

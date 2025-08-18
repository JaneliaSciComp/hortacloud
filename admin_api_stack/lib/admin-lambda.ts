import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Fn } from "aws-cdk-lib";
import { join } from "path";


const { AWS_ACCOUNT, AWS_REGION,ADMIN_USER_EMAIL } = process.env;

interface LambaServiceProps {
  org: string;
  stage: string;
}

export class LambdaService extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(
    scope: Construct,
    id: string,
    userPool: IUserPool,
    props: LambaServiceProps
  ) {
    super(scope, id);


    // set up api gateway
    this.api = new apigateway.RestApi(
      this,
      `${props.org}-horta-cloud-admin-lambda-api-${props.stage}`,
      {
        restApiName: `Horta Cloud Admin Service - ${props.org} ${props.stage}`,
        description: `Admin service to manage users & generate app stream urls for ${props.org} ${props.stage}`,
      }
    );

    // set up authorizer to use cognito pools
    const authorizer = new apigateway.CfnAuthorizer(this, "cfnAuth", {
      restApiId: this.api.restApiId,
      name: "HortaCloudAPIAuthorizer",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.Authorization",
      providerArns: [userPool.userPoolArn],
    });

    // add the /auth resource
    const asFleetName = cdk.Fn.importValue(
      `${props.org}-hc-FleetID-${props.stage}`
    );
    const asStackName = cdk.Fn.importValue(
      `${props.org}-hc-StackID-${props.stage}`
    );

    const authHandler = new lambda.Function(this, "HortaCloudAuthHandler", {
      runtime: lambda.Runtime.NODEJS_20_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("appstream-lambda-resources"),
      handler: "index.handler",
      environment: {
        FLEETNAME: asFleetName,
        STACKNAME: asStackName,
      },
    });

    authHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appstream:CreateStreamingURL"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:appstream:${AWS_REGION}:${AWS_ACCOUNT}:fleet/${asFleetName}`,
          `arn:aws:appstream:${AWS_REGION}:${AWS_ACCOUNT}:stack/${asStackName}`,
        ],
      })
    );

    const authIntegration = new apigateway.LambdaIntegration(authHandler, {});

    const auth = this.api.root.addResource("auth");

    auth.addMethod("POST", authIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref,
      },
    });

    auth.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["POST", "OPTIONS"],
    });

    // creates a custom role that grants the lambda permissions to access the workstation VPC
    const userListRole = new iam.Role(
      this,
      `${props.org}-userListRole-${props.stage}`,
      {
        roleName: `${props.org}-userListRole-${props.stage}`,
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaVPCAccessExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    // get the vpc from the vpc-stack
    const workstationVpc = ec2.Vpc.fromLookup(this, "ImportedVPC", {
      isDefault: false,
      vpcName: `${props.org}-hc-vpc-${props.stage}`,
    });

    // add the /user-list resource
    const userListHandler = new lambda.Function(
      this,
      "HortaCloudUserListHandler",
      {
        runtime: lambda.Runtime.NODEJS_20_X, // So we can use async in widget.js
        role: userListRole,
        vpc: workstationVpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        code: lambda.Code.fromAsset(
          path.join(__dirname, "..", "user-list-resources")
        ),
        handler: "index.handler",
        environment: {
          GROUP: "admins",
	  USERPOOL: userPool.userPoolId,
	  AUTH_USER: process.env.ADMIN_USER_EMAIL ?? "",
	  JACS_HOSTNAME: cdk.Fn.importValue(
            `${props.org}-hc-ServerIP-${props.stage}`
          ),
        },
      }
    );

    userListHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetRandomPassword"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
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
          "cognito-idp:AdminResetUserPassword",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:ListUsers",
          "cognito-idp:ListGroups",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
        ],
        effect: iam.Effect.ALLOW,
        resources: [userPool.userPoolArn],
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
        authorizerId: authorizer.ref,
      },
    });
    userList.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"],
    });

    // add the /{proxy+} resource
    const proxyIntegration = new apigateway.LambdaIntegration(
      userListHandler,
      {}
    );

    const proxy = this.api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(userListHandler),

      // 'false' will require explicitly adding methods on the `proxy` resource
      anyMethod: false, // 'true' is the default
    });
    proxy.addMethod("ANY", proxyIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref,
      },
    });

    proxy.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      });
  }

}

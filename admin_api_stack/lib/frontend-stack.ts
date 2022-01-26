import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";


interface WebAppStackProps extends cdk.StackProps {
  stage: string;
  org: string;
}

export class HortaCloudWebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);
    // create a bucket to store the websites static contents
    const siteBucket = new s3.Bucket(this, `${props.org}-HortaCloudWebAdminBucket-${props.stage}`, {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // upload the files from the site-contents directory to the bucket
    // created above
    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset("../website/build")],
      destinationBucket: siteBucket
    });

    new cdk.CfnOutput(this, "SiteBucketUrl", {
      value: siteBucket.bucketWebsiteUrl
    });
  }
}

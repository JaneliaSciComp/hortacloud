import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

interface WebAppStackProps extends StackProps {
  stage: string;
  org: string;
}

export class HortaCloudWebAppStack extends Stack {
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);
    // create a bucket to store the websites static contents
    const siteBucket = new Bucket(this, `${props.org}-hc-webadmin-${props.stage}`, {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      bucketName: `${props.org}-hc-webadmin-${props.stage}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // upload the files from the site-contents directory to the bucket
    // created above
    new BucketDeployment(this, "DeployWithInvalidation", {
      sources: [Source.asset("../website/build")],
      destinationBucket: siteBucket
    });

    new CfnOutput(this, "SiteBucketUrl", {
      value: siteBucket.bucketWebsiteUrl
    });
  }
}

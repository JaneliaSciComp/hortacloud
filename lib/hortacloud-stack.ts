import * as cdk from '@aws-cdk/core';
// import * as sqs from '@aws-cdk/aws-sqs';

export class HortacloudStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'HortacloudQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

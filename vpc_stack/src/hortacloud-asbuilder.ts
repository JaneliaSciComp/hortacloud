import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import { CfnImageBuilder } from "aws-cdk-lib/aws-appstream";
import {
  createResourceId,
  getHortaCloudConfig,
  VpcInstanceProps,
} from "../../common/hortacloud-common";

export class HortaCloudAppstreamBuilder extends Construct {
  constructor(scope: Construct, id: string, vpcProps: VpcInstanceProps) {
    super(scope, id);

    const hortaConfig = getHortaCloudConfig();

    const imageBuilderInstanceName = createResourceId(
      hortaConfig,
      "image-builder"
    );

    new CfnImageBuilder(this, "ImageBuilder", {
      name: imageBuilderInstanceName,
      displayName: "HortaCloud App ImageBuilder",
      instanceType: hortaConfig.hortaWorkstationInstanceType,
      enableDefaultInternetAccess: false,
      imageName: hortaConfig.hortaWorkstationImageName,
      vpcConfig: {
        subnetIds: vpcProps.privateSubnetIds,
      },
    });

    new CfnOutput(this, "AppstreamImage", {
      value: createResourceId(hortaConfig, "HortaCloudWorkstation"),
      exportName: createResourceId(hortaConfig, "HortaCloudImage"),
    });
  }
}

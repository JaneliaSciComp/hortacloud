import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";

import { HortacloudAppstream } from "./hortacloud-appstream";
import { VpcInstanceProps } from "../../common/hortacloud-common";

export interface WorkstationStackProps extends StackProps, VpcInstanceProps {}

export class HortaCloudWorkstationStack extends Stack {
  public readonly appstreamStack: HortacloudAppstream;

  constructor(scope: Construct, id: string, props: WorkstationStackProps) {
    super(scope, id, props);

    this.appstreamStack = new HortacloudAppstream(this, "Workstation", props);
  }
}

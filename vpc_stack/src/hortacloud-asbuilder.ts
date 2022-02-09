import { Construct } from "constructs";
import { CfnOutput } from "aws-cdk-lib";
import { CfnImageBuilder } from "aws-cdk-lib/aws-appstream";
import { createResourceId, getHortaCloudConfig, VpcInstanceProps } from "../../common/hortacloud-common";


export class HortaCloudAppstreamBuilder extends Construct {

    constructor(scope: Construct, 
                id: string,
                vpcProps: VpcInstanceProps) {
        super(scope, id);
        const hortaCloudConfig = getHortaCloudConfig();

        const imageBuilderInstanceName = createResourceId(hortaCloudConfig, 'image-builder');

        new CfnImageBuilder(this, 'ImageBuilder', {
            name: imageBuilderInstanceName,
            displayName: "HortaCloud App ImageBuilder",
            instanceType: 'stream.graphics.g4dn.xlarge',
            enableDefaultInternetAccess: true,
            imageName: 'AppStream-Graphics-G4dn-WinServer2019-07-19-2021',
            vpcConfig: {
                subnetIds: vpcProps.publicSubnetIds
            }
        });

        new CfnOutput(this, 'AppstreamImage', {
            value: createResourceId(hortaCloudConfig, 'HortaCloudWorkstation'),
            exportName: createResourceId(hortaCloudConfig, 'HortaCloudImage')
        });
    
    }

}

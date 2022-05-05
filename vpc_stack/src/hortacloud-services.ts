import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';

import { IVpc } from 'aws-cdk-lib/aws-ec2';

import { HortaCloudCognitoBackup } from './hortacloud-backup-lambda';
import { HortaCloudJACS } from './hortacloud-jacs';
import { HortaCloudAppstreamBuilder } from './hortacloud-asbuilder';

export interface ServicesStackProps extends StackProps {
    vpc: IVpc;
}

export class HortaCloudServicesStack extends Stack {

    public readonly cognitoBackup: HortaCloudCognitoBackup;
    public readonly server: HortaCloudJACS;
    public readonly appBuilder: HortaCloudAppstreamBuilder;

    constructor(scope: Construct, 
                id: string,
                props: ServicesStackProps) {
        super(scope, id, props);
        this.cognitoBackup = new HortaCloudCognitoBackup(this, "HortaUsers", "us-east-1_0byNKiLgS"); // !!!!!
        // this.server = new HortaCloudJACS(this, 'JACS', props.vpc);
        // this.appBuilder = new HortaCloudAppstreamBuilder(this, 'AppBuilder', {
        //     vpcId: props.vpc.vpcId,
        //     publicSubnetIds: props.vpc.publicSubnets.map(sn => sn.subnetId),
        //     privateSubnetIds: props.vpc.privateSubnets.map(sn => sn.subnetId)
        // });
    }
}

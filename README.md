# janeliaHortaCloud

JaneliaHortaCloud is a streaming 3D annotation platform for large microscopy data that runs entirely in the cloud. It is based on the [Janelia Workstation](https://github.com/JaneliaSciComp/workstation) software and was originally developed in support of the [MouseLight Team Project](https://www.janelia.org/project-team/mouselight). 

It combines state-of-the-art volumetric visualization, advanced features for 3D neuronal annotation, and real-time multi-user collaboration with a set of enterprise-grade backend microservices for moving and processing large amounts of data rapidly and securely. JaneliaHortaCloud takes advantage of cloud-based Virtual Desktop Infrastructure (VDI) to perform all 3D rendering in cloud-leased GPUs which are data-adjacent, and only transfer a high-fidelity interactive video stream to each annotator’s local compute platform through a web browser.

![System archtecture diagram](docs/images/system_architecture.png)

## Getting started

To make use of this repo, you should have **node v14** installed on your local machine. We recommend using [nvm](https://github.com/nvm-sh/nvm) to install and activate this version of node. You should also install the [AWS CDK](https://aws.amazon.com/cdk/) and configure it with your AWS account information.

After cloning this repo, run `npm install` to download dependencies.

Then run `npm run build` to build the code and `cdk deploy` to deploy it to your AWS account.

## Implementation details

The deployment uses AWS CDK to create AWS resources on your AWS account as shown in the diagram below. 

![Cloud archtecture diagram](docs/images/cloud_architecture.png)

## Deveopment

### Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run cdk -- deploy`  deploy this stack to your default AWS account/region
* `npm run cdk -- diff`  compare deployed stack with current state
* `npm run cdk -- synth`  emits the synthesized CloudFormation template

### Deployment examples

To a specific stage of the services and vpc stacks use the example below:

```
HORTA_STAGE=prod
HORTA_ORG=janelia

HORTA_STAGE=${HORTA_STAGE} npm run cleancdk -- deploy ${HORTA_ORG}-hc-services-${HORTA_STAGE} ${HORTA_ORG}-hc-vpc-${HORTA_STAGE}
```

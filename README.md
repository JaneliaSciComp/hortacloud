# janeliaHortaCloud

JaneliaHortaCloud is a streaming 3D annotation platform for large microscopy data that runs entirely in the cloud. It is based on the [Janelia Workstation](https://github.com/JaneliaSciComp/workstation) software and was originally developed in support of the [MouseLight Team Project](https://www.janelia.org/project-team/mouselight). 

It combines state-of-the-art volumetric visualization, advanced features for 3D neuronal annotation, and real-time multi-user collaboration with a set of enterprise-grade backend microservices for moving and processing large amounts of data rapidly and securely. JaneliaHortaCloud takes advantage of cloud-based Virtual Desktop Infrastructure (VDI) to perform all 3D rendering in cloud-leased GPUs which are data-adjacent, and only transfer a high-fidelity interactive video stream to each annotator’s local compute platform through a web browser.

![System archtecture diagram](docs/images/system_architecture.png)

## Getting Started

To make use of this repo, you should have **node v14** installed on your local machine. We recommend using [nvm](https://github.com/nvm-sh/nvm) to install and activate this version of node. You should also install the [AWS CDK](https://aws.amazon.com/cdk/) and configure it with your AWS account information.

After cloning this repo, run `npm run setup` to download dependencies.

Then you can run `npm run deploy` to build and deploy the code.

## Implementation details

The deployment uses AWS CDK to create AWS resources on your AWS account as shown in the diagram below. All services run in a secured Virtual Private Cloud (VPC).

![Cloud archtecture diagram](docs/images/cloud_architecture.png)

### Deployment examples

The full deployment of the application requires 3 steps. 
1) Deploy the back-end stacks - this includes the appstream builder
2) Connect to appstream builder and install the workstation application. This is a semiautomated step that involves copying and running two PowerShell scripts onto the appstream builder instance.
3) Deploy the front-end stacks 


#### Back-end and front-end stacks deployment
To deploy the backend and frontend stacks use the example below in which the `<step>` can be `backend` or `frontend`

```
HORTA_STAGE=prod
HORTA_ORG=janelia
ADMIN_USER_EMAIL=<adminuser>@<organization>

ADMIN_USER_EMAIL=${ADMIN_USER_EMAIL} HORTA_STAGE=${HORTA_STAGE} npm run deploy-<step>
```

#### Client app installation
For client installation start and connect to the appstream builder instance then copy the following scripts from this repo to the appstream instance:
- [installcmd.ps1](vpc_stack/src/asbuilder/installcmd.ps1) - installs JDK and the workstation
- [createappimage.ps1](vpc_stack/src/asbuilder/createappimage.ps1) - creates the appstream image

After you copied or created the scripts open an "Administrator Power Shell" window and run the scripts one at a time - first `installcmd.ps1` and then `createappimage.ps1`.

The first script `installcmd.ps1` will prompt you where to install the Workstation - please select "C:\apps" as the location of the JaneliaWorkstation install directory. After the workstation is installed run it using `c:\apps\runJaneliaWorkstation.ps1` from a `PowerShell` window.
Once you are done and you created all users in the workstation you can run `createappimage.ps1` which will begin snapshotting the builder and creating the image. Once `createappimage.ps1` is completed, the builder will no longer be usable until the snapshotting process completes.

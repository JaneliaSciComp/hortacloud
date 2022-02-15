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


### Setting up the environment.
Before you can deploy the application, there are a few environment variables that need to be set.
This can be done by exporting them on the command line
```shell
export HORTA_STAGE=prod
```
or creating a .env file.
```
HORTA_STAGE=prod
HORTA_ORG=janelia
ADMIN_USER_EMAIL=<adminuser>@<organization>
AWS_ACCOUNT=123456789012
AWS_REGION=us-east-1
```
### Back-end and front-end stacks deployment
To deploy the backend and frontend stacks use the example below in which the `<step>` can be `backend` or `frontend`

```bash
npm run deploy-<step>
```

### Client app installation

For client installation start and connect to the appstream builder instance then copy the following scripts from this repo to the appstream instance:
- [installcmd.ps1](vpc_stack/src/asbuilder/installcmd.ps1) - installs JDK and the workstation
- [createappimage.ps1](vpc_stack/src/asbuilder/createappimage.ps1) - creates the appstream image

After you copied or created the scripts:
* Log in to the AWS console and go to https://console.aws.amazon.com/appstream2
* Find your new builder in the "Images > Image Builder" tab
* Click on the image name and open an "Administrator" window by clicking on the "Connect" button.
* Copy the installation scripts from your local machine to AppStream:
    * Click on the folder icon at the top left of the window
    * Use the `Upload Files` icon to find the files on your machine and upload them. 
* Open the powershell by typing "Windows Powershell" in the search found at the bottom left of the window. Then right click to "run as administrator"
* change to the directory where you uploaded the installation scripts, eg:<br/> `cd 'C:\Users\ImagebuilderAdmin\My Files\Temporary Files'`
* Run `installcmd.ps1 <serverName>` where &lt;serverName&gt; is the name of the backend EC2 instance - typically it looks like ` ip-<ip4 with dashes instead of dots>.ec2.internal`. This will install the JDK and the workstation. When the workstation installer prompts you for the install directory select `C:\apps` as the JaneliaWorkstation location.
* Run `c:\apps\runJaneliaWorkstation.ps1` to start the workstation 
    * when prompted, login as the root user with password 'root'
* Add users
    * Select > window > core > Administration tool
    * Select Users from the choices
    * Click on the 'New User' button at the bottom of the screen
    * Name must be the email address that the user will use to log in.
    * Password must be empty
    * Add them to the appropriate groups by seelcting a group from the dropdown menu and clicking 'Add Group'
    * finally click 'Save User'
* close down the workstation
* Run `createappimage.ps1`. Keep in mind that once you start this step the builder instance begins the snapshotting process and it will not be usable until it completes. After this is completed the appstream image should be available and the builder is in a stop state. To use it again you need to start it and then you can connect to it again.
* You can now safely close the appstream session and return to the appstream console. There you will see a new image in the image registry with a status of `Pending`.
* Once the image status has changed to a status of `Available` you can start the fleet by going to the `Fleets` page on the appstream site.
  * Select your fleet from the list of fleets and then select 'Start' from the `Action` menu.
* `npm run deploy-frontend`

### Troubleshooting

#### Troubleshooting client app installation
If the client app installation fails for any reason - for example you did not start the installation in an administrator power shell or any other reason - before you attempt the install again you must remove everything that was installed by the install script. Uninstall all applications installed with scoop and remove the 'C:\apps' folder. To do that simply run:
```
scoop uninstall scoop
del c:\apps
```
When prompted whether you really want to uninstall everything, just select "yes" or "all".

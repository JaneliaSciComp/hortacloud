# HortaCloud

Deploy the janeliaHortaCloud stack to AWS.

## Getting started

After cloning this repo, run `npm install` to download dependencies.

Then you can run `npm run build` to build the code and `cdk deploy` to deploy it.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run cdk -- deploy`  deploy this stack to your default AWS account/region
* `npm run cdk -- diff`  compare deployed stack with current state
* `npm run cdk -- synth`  emits the synthesized CloudFormation template

## Deploy examples

To a specific stage of the services and vpc stacks use the example below:

```
HORTA_STAGE=prod
HORTA_ORG=janelia

HORTA_STAGE=${HORTA_STAGE} npm run cleancdk -- deploy ${HORTA_ORG}-hc-services-${HORTA_STAGE} ${HORTA_ORG}-hc-vpc-${HORTA_STAGE}
```

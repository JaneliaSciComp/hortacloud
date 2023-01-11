const execSync = require('child_process').execSync;
const { AppStream } = require('aws-sdk');
const fs = require('fs');
const chalk = require('chalk');
const dotenv = require('dotenv');
const prompts = require('prompts');
const { getSessionnCredentials, getEnvWithSessionCredentials } = require('./credentials');

// set env from .env file if present
dotenv.config();

const exec = (command, options = {}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options };
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE, AWS_REGION } = process.env;
console.log(chalk.cyan("🔎 Checking environment."));

const expectedEnvVars = [
  "HORTA_ORG",
  "HORTA_STAGE",
  "AWS_REGION",
  "AWS_ACCOUNT",
];

function removeAppStreamImage(credentials) {
  const imageName = `${HORTA_ORG}-hc-HortaCloudWorkstation-${HORTA_STAGE}`;

  try {
    const appstream = new AppStream({ 
      region: AWS_REGION,
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,  
    });
    console.log(chalk.yellow(`⚠️  Removing appstream image ${imageName}`));
    const deleteImageReq = appstream.deleteImage({
      Name: imageName,
    });
    deleteImageReq.send();
    console.log(chalk.green(`✅ Removed appstream image ${imageName}`));
  } catch (error) {
    console.log(chalk.red(`🚨 Error while trying to remove ${imageName}`));
    console.log(chalk.red(error));
    console.log(chalk.red(`Please manually remove the AppStream image ${imageName} at:`));
    console.log(chalk.white("https://console.aws.amazon.com/appstream2/home"));
  }
}

function destroy(argv, credentials) {
  if (fs.existsSync('./website/build')) {
    console.log(chalk.yellow("⚠️  Removing web admin frontend stack."));
    exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_website`, {
      cwd: "./admin_api_stack/",
      env: getEnvWithSessionCredentials(credentials),
    });
  }

  console.log(chalk.yellow("⚠️  Removing web admin backend stack."));
  exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_api`, {
    cwd: "./admin_api_stack/",
    env: getEnvWithSessionCredentials(credentials),
  });

  if (!argv.keepWorkstation) {
    console.log(chalk.yellow("⚠️  Removing Workstation stack"));
    exec(`npm run cdk -- destroy -f --require-approval never Workstation`, {
      cwd: "./workstation_stack/",
      env: getEnvWithSessionCredentials(credentials),
    });
  }

  if (!argv.keepBackend) {
    console.log(chalk.yellow("⚠️  Removing VPC stack."));
    exec(`npm run cdk -- destroy -f --all --require-approval never`, {
      cwd: "./vpc_stack/",
      env: getEnvWithSessionCredentials(credentials),
    });
  }

  if (argv.undeployCognito) {
    // cognito has to be explicitly removed 
    // by default we keep it because we don't want to recreate users
    console.log(chalk.yellow("⚠️  Removing Cognito stack."));
    exec(
      `npm run cdk -- destroy -f --all --require-approval never`,
      { 
        cwd: "./cognito_stack/",
        env: getEnvWithSessionCredentials(credentials),
      }
    );
  }

  console.log(chalk.green("✅ All stacks have been removed."));
  if (!argv.keepHortaImage && !argv.keepWorkstation) {
    // if we keep the workstation fleet
    // the image cannot be removed anyway
    // because it is still associated with the fleet
    removeAppStreamImage(credentials);
  }
}

let missingVarsCount = 0;

expectedEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.log(chalk.red(`🚨 Environment variable ${envVar} was not set.`));
    missingVarsCount += 1;
  }
});

if (missingVarsCount > 0) {
  process.exit(1);
}

console.log(chalk.green("✅ environment looks good."));
console.log(
  chalk.cyan(
    `Removing stack ORG: ${process.env.HORTA_ORG}, ENV: ${process.env.HORTA_STAGE}`
  )
);

const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("$0 [options]")
  .option('use-mfa', {
    type: 'boolean',
    default: false,
    describe: 'use MFA is an MFA device is available',
  })
  .option('u', {
    alias: 'undeploy-cognito',
    type: 'boolean',
    describe: 'Undeploy the cognito stack as well'
  })
  .option('b', {
    alias: 'keep-backend',
    type: 'boolean',
    describe: 'If set keep the JACS stack'
  })
  .option('keep-workstation', {
    type: 'boolean',
    describe: 'Do not remove the workstation appstream stack and fleet.',
  })
  .option('keep-horta-image', {
    type: 'boolean',
    describe: 'Do not remove Horta AppStream image',
  })
  .argv;

(async () => {
  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Do you wish to continue?',
    initial: false
  });

  if (response.confirm) {
    const credentials = await getSessionnCredentials(AWS_REGION, argv.useMfa);
    destroy(argv, credentials);
  } else {
    console.log(chalk.red("🚨 stack removal aborted"));
    process.exit(0);
  }
})();

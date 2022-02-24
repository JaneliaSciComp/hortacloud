const execSync = require("child_process").execSync;
const { AppStream } = require("aws-sdk");
const chalk = require("chalk");
const dotenv = require('dotenv')

// set env from .env file if present
const result = dotenv.config()

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE, AWS_REGION, AWS_ACCOUNT } =
  process.env;
console.log(chalk.cyan("🔎 Checking environment."));

const expectedEnvVars = [
  "HORTA_ORG",
  "HORTA_STAGE",
  "AWS_REGION",
  "AWS_ACCOUNT"
];

let missingVarsCount = 0;

expectedEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.log(chalk.red(`🚨 Environment variable ${envVar} was not set.`));
    missingVarsCount += 1;
  }
});

if (missingVarsCount > 0) {
  process.exit(1);
}
console.log(chalk.green("✅ environment looks good."));

console.log(chalk.yellow("⚠️  Removing web admin frontend stack."));
exec(
  `npm run cdk -- destroy -f --require-approval never -c deploy=admin_website`,
  { cwd: "./admin_api_stack/" }
);

console.log(chalk.yellow("⚠️  Removing web admin backend stack."));
exec(
  `npm run cdk -- destroy -f --require-approval never -c deploy=admin_api`,
  { cwd: "./admin_api_stack/" }
);

console.log(chalk.yellow("⚠️  Removing Workstation stack"));
exec(
  `npm run cdk -- destroy -f --require-approval never Workstation`,
  { cwd: "./workstation_stack/" }
);

console.log(chalk.yellow("⚠️  Removing VPC stack."));
exec(
  `npm run cdk -- destroy -f --all --require-approval never`,
  { cwd: "./vpc_stack/" }
);

console.log(chalk.green("✅ All stacks have been removed."));
removeAppStreamImage();

function removeAppStreamImage() {
  const imageName = `${HORTA_ORG}-hc-HortaCloudWorkstation-${HORTA_STAGE}`;

  try {
    const appstream = new AppStream({ AWS_REGION });
    console.log(chalk.yellow(`⚠️  Removing appstream image ${imageName}`));
    const deleteImageReq = appstream.deleteImage({
      Name: imageName
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

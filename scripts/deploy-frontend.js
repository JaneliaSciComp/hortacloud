const execSync = require("child_process").execSync;
const chalk = require("chalk");
const open = require("open");
const { CloudFormation } = require("aws-sdk");

const exec = (command, options = {}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options };
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE, ADMIN_USER_EMAIL } = process.env;
console.log(chalk.cyan("🔎 Checking environment."));

if (!HORTA_ORG || !HORTA_STAGE || !ADMIN_USER_EMAIL) {
  console.log(
    chalk.red(
      "🚨 environment variables HORTA_ORG, HORTA_STAGE or ADMIN_USER_EMAIL were not set."
    )
  );
  process.exit(1);
}
console.log(chalk.green("✅ environment looks good."));

// deploy all frontend stacks

console.log(chalk.cyan("🚚 Deploying Workstation stack"));
exec(
    `npm run cdk -- deploy --require-approval never Workstation`,
    { cwd: "./workstation_stack/" }
);

console.log(chalk.cyan("🚚 Deploying web admin backend stack."));
exec(`npm run cdk -- deploy --all --require-approval never -c deploy=admin_api`, {
  cwd: "./admin_api_stack/"
});

console.log(chalk.cyan("🛠  Generating web admin frontend config."));
exec(`node scripts/buildConfig.js`, { cwd: "./website" });

console.log(chalk.cyan("🛠  Building web admin frontend."));
exec(`npm run build`, { cwd: "./website" });

console.log(chalk.cyan("🚚 Deploying web admin frontend stack."));
exec(`npm run cdk -- deploy --all --require-approval never -c deploy=admin_website`, {
  cwd: "./admin_api_stack/"
});

// post install directions
const region = "us-east-1";
const cloudformation = new CloudFormation({ region });
async function postInstall() {
  const outputs = {};

  // get stack info
  const apiStack = await cloudformation
    .describeStacks({
      StackName: `${HORTA_ORG}-HortaCloudWebAppStack-${HORTA_STAGE}`
    })
    .promise();

  // build the outputs into a simple object
  apiStack.Stacks[0].Outputs.forEach(({ OutputKey, OutputValue }) => {
    outputs[OutputKey] = OutputValue;
  });

  console.log(
    chalk.green(`✅ Go to ${outputs.SiteBucketUrl} to login to HortaCloud.`)
  );
  console.log(chalk.white(`Username: ${ADMIN_USER_EMAIL}`));
  console.log(
    chalk.white("Password: will be emailed to the admin user account.")
  );
  open(outputs.SiteBucketUrl);
}
postInstall();

const execSync = require("child_process").execSync;
const chalk = require("chalk");
const open = require("open");
const { CloudFormation, AppStream } = require("aws-sdk");
const dotenv = require("dotenv");

const exec = (command, options = {}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options };
  execSync(command, combinedOptions);
};

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function deploy_cognito() {
    // deploy the Cognito stack
    console.log(chalk.cyan("🚚 Deploying Cognito"));
    exec(`npm run cdk -- deploy --all --require-approval never`, {
      cwd: "./cognito_stack/"
    });
}

async function deploy_vpc_and_workstation() {
  const appstream = new AppStream({ AWS_REGION });
  const sleep_duration = 2;

  // deploy the VPC stack
  console.log(chalk.cyan("🚚 Deploying VPC stack"));
  exec(`npm run cdk -- deploy --all --require-approval never`, {
    cwd: "./vpc_stack/"
  });

  console.log(chalk.green("✅ Image builder is ready for your input."));
  console.log(
    chalk.yellow(
      "⚠️  Please make a note of the JACS server ip in the output above. It will be required to complete the installation. It will look like ip-10-0-0-90.ec2.internal"
    )
  );
  console.log(
    chalk.yellow(
      "⚠️  Please follow the instructions in our README to complete the workstation client configuration. This script will now wait until your configured AppStream image is available."
    )
  );
  console.log(
    chalk.white(
      "https://github.com/JaneliaSciComp/hortacloud/blob/main/README.md#client-app-installation"
    )
  );
  console.log(chalk.yellow());

  // check that the appStream image is available
  const imageName = `${HORTA_ORG}-hc-HortaCloudWorkstation-${HORTA_STAGE}`;
  console.log(chalk.cyan(`🔎 Waiting for AppStream image ${imageName}`));
  let imageAvailable = false;
  while (!imageAvailable) {
    try {
      const images = await appstream
        .describeImages({
          Names: [imageName]
        })
        .promise();
      const [image] = images.Images;
      if (image) {
        if (image.State === "AVAILABLE") {
          imageAvailable = true;
        }
      }
    } catch (error) {
      process.stdout.write(".");
    }

    if (imageAvailable === false) {
      process.stdout.write(".");
      await sleep(1000 * sleep_duration);
    }
  }
  console.log(chalk.green("\n✅ AppStream image found."));

  console.log(chalk.cyan("🚚 Deploying Workstation stack"));
  exec(`npm run cdk -- deploy --require-approval never Workstation`, {
    cwd: "./workstation_stack/"
  });

  // check that the appStream fleet is up and ready
  const fleetName = `${HORTA_ORG}-hc-workstation-fleet-${HORTA_STAGE}`;
  console.log(chalk.cyan(`🔎 Looking for AppStream fleet ${fleetName}...`));
  console.log(chalk.white("This could take 10-20 minutes"));

  let fleetRunning = false;
  while (!fleetRunning) {
    try {
      const fleets = await appstream
        .describeFleets({
          Names: [fleetName]
        })
        .promise();
      const [fleet] = fleets.Fleets;
      if (fleet) {
        if (fleet.State === "RUNNING") {
          fleetRunning = true;
        } else if (fleet.State === "STOPPED") {
          // Start the fleet
          const startFleetReq = appstream.startFleet({
            Name: fleetName
          });
          startFleetReq.send();
        } else {
          process.stdout.write(".");
        }
      }
    } catch (error) {
      if (error.code !== "ResourceNotFoundException") {
        console.log(
          chalk.yellow(
            `⚠️  Please Activate your fleet ${fleetName} in the AppStream console at: `
          )
        );
        console.log(
          chalk.white("https://console.aws.amazon.com/appstream2/home")
        );
        console.log(
          chalk.yellow(
            `Select your fleet ${fleetName} and choose "Start" in the Action menu`
          )
        );
        throw error;
      } else {
        process.stdout.write(".");
      }
    }

    if (fleetRunning === false) {
      await sleep(1000 * sleep_duration);
    }
  }

  console.log(chalk.green("\n✅ Found a running fleet, proceeding"));
}

async function deploy_admin_site() {
  // deploy all frontend stacks
  console.log(chalk.cyan("\n🚚 Deploying web admin backend stack."));
  // the Vpc.fromLookup function was looking in the cdk.context.json file
  // to get a cached value. If the vpc stack had been deleted and recreated,
  // the old id was still being used from the context and failed. This
  // command clears out that context on each deployment.
  exec(`npm run cdk -- context --clear`, {
    cwd: "./admin_api_stack/"
  });
  exec(
    `npm run cdk -- deploy --all --require-approval never -c deploy=admin_api`,
    {
      cwd: "./admin_api_stack/"
    }
  );

  console.log(chalk.cyan("🛠  Generating web admin frontend config."));
  exec(`node scripts/buildConfig.js`, { cwd: "./website" });

  console.log(chalk.cyan("🛠  Building web admin frontend."));
  exec(`npm run build`, { cwd: "./website" });

  console.log(chalk.cyan("🚚 Deploying web admin frontend stack."));
  exec(
    `npm run cdk -- deploy --all --require-approval never -c deploy=admin_website`,
    {
      cwd: "./admin_api_stack/"
    }
  );
}

async function install(argv) {
  if (argv.includeCognito) {
    await deploy_cognito();
  }
  if (!argv.adminOnly) {
    await deploy_vpc_and_workstation();
  }
  await deploy_admin_site();

  // post install directions
  const postOutputs = {};

  // get stack info
  const cloudformation = new CloudFormation({ AWS_REGION });
  const apiStack = await cloudformation
    .describeStacks({
      StackName: `${HORTA_ORG}-hc-adminWebApp-${HORTA_STAGE}`
    })
    .promise();

  // build the outputs into a simple object
  apiStack.Stacks[0].Outputs.forEach(({ OutputKey, OutputValue }) => {
    postOutputs[OutputKey] = OutputValue;
  });

  console.log(
    chalk.green(`✅ Go to ${postOutputs.SiteBucketUrl} to login to HortaCloud.`)
  );
  console.log(chalk.white(`Username: ${ADMIN_USER_EMAIL}`));
  console.log(
    chalk.white("Password: will be emailed to the admin user account.")
  );
  open(postOutputs.SiteBucketUrl);
}

const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("$0 [options]")
  .option('a', {
    alias: 'admin-only',
    type: 'boolean',
    describe:  'Only deploy the admin website. Requires a deployed workstation stack.'
  })
  .option('u', {
    alias: 'include-cognito',
    type: 'boolean',
    describe: 'Include the cognito stack in the deployment'
  })
  .argv;

// set env from .env file if present
dotenv.config();

const { HORTA_ORG, HORTA_STAGE, ADMIN_USER_EMAIL, AWS_REGION } = process.env;
console.log(chalk.cyan("🔎 Checking environment."));

const expectedEnvVars = [
  "HORTA_ORG",
  "HORTA_STAGE",
  "ADMIN_USER_EMAIL",
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

install(argv);

const execSync = require("child_process").execSync;
const chalk = require("chalk");

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE }  = process.env;
console.log(chalk.cyan("🔎 Checking environment."));

if (!HORTA_ORG || !HORTA_STAGE) {
  console.log(chalk.red("🚨 environment variables HORTA_ORG or HORTA_STAGE were missing"));
  return;
}

console.log(chalk.green("✓ environment looks good." ));


// console.log("🚚 Deploying VPC stack");
// exec(`cleancdk -- deploy --require-approval never ${HORTA_ORG}-hc-services-${HORTA_STAGE} ${HORTA_ORG}-hc-vpc-${HORTA_STAGE}`, {cwd: "./vpc_stack/" });

console.log(chalk.cyan("🚚 Deploying web admin backend stack."));
exec(`cdk deploy --all --require-approval never -c deploy=admin_api`, {cwd: "./admin_api_stack/" });

console.log(chalk.cyan("🛠  Generating web admin frontend config."));
exec(`node scripts/buildConfig.js`, { cwd: "./website" });

console.log(chalk.cyan("🛠  Building web admin frontend."));
exec(`npm run build`, { cwd: "./website" });

console.log(chalk.cyan("🚚 Deploying web admin frontend stack."));
exec(`cdk deploy --all --require-approval never -c deploy=admin_website`, {cwd: "./admin_api_stack/" });

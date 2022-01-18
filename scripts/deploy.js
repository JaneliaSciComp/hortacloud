const execSync = require("child_process").execSync;
const chalk = require("chalk");

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

//console.log("- Deploying VPC stack");
//exec(`cleancdk -- deploy --require-approval never janelia-hc-services-prod janelia-hc-vpc-prod`, {cwd: "./admin_api_stack/" });

console.log(chalk.cyan("🚚 Deploying web admin backend stack."));
exec(`cdk deploy --all --require-approval never -c deploy=backend`, {cwd: "./admin_api_stack/" });

console.log(chalk.cyan("🛠  Generating web admin frontend config."));
exec(`node scripts/buildConfig.js`, { cwd: "./website" });

console.log(chalk.cyan("🛠  Building web admin frontend."));
exec(`npm run build`, { cwd: "./website" });

console.log(chalk.cyan("🚚 Deploying web admin frontend stack."));
exec(`cdk deploy --all --require-approval never -c deploy=frontend`, {cwd: "./admin_api_stack/" });

const execSync = require("child_process").execSync;
const chalk = require("chalk");

const exec = (command, options = {}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options };
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE } = process.env;
console.log(chalk.cyan("🔎 Checking environment."));

if (!HORTA_ORG || !HORTA_STAGE ) {
  console.log(
    chalk.red(
      "🚨 environment variables HORTA_ORG and HORTA_STAGE were not set."
    )
  );
  process.exit(1);
}
console.log(chalk.green("✅ environment looks good."));

// deploy the VPC stack

console.log(chalk.cyan("🚚 Deploying VPC stack"));
exec(
  `npm run cdk -- deploy --all --require-approval never`,
  { cwd: "./vpc_stack/" }
);

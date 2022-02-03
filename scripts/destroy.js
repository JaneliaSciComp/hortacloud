const execSync = require("child_process").execSync;
const chalk = require("chalk");

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
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



console.log(chalk.red("🚨 Removing web admin frontend stack."));
exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_website`, {cwd: "./admin_api_stack/" });

console.log(chalk.red("️🚨 Removing web admin backend stack."));
exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_api`, {cwd: "./admin_api_stack/" });

console.log(chalk.red("🚨 Removing Workstation stack"));
exec(
    `npm run cdk -- destroy -f --require-approval never ${HORTA_ORG}-hc-workstation-${HORTA_STAGE}`,
    { cwd: "./workstation_stack/" }
);

console.log(chalk.red("🚨 Removing VPC stack."));
exec(`npm run cdk -- destroy -f --all --require-approval never`, {cwd: "./vpc_stack/" });

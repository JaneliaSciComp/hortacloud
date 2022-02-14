const execSync = require("child_process").execSync;
const chalk = require("chalk");
const dotenv = require('dotenv')

// set env from .env file if present
const result = dotenv.config()

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

console.log(chalk.red("🚨 Removing web admin frontend stack."));
exec(
  `npm run cdk -- destroy -f --require-approval never -c deploy=admin_website`,
  { cwd: "./admin_api_stack/" }
);

console.log(chalk.red("️🚨 Removing web admin backend stack."));
exec(
  `npm run cdk -- destroy -f --require-approval never -c deploy=admin_api`,
  { cwd: "./admin_api_stack/" }
);

console.log(chalk.red("🚨 Removing Workstation stack"));
exec(
  `npm run cdk -- destroy -f --require-approval never Workstation`,
  { cwd: "./workstation_stack/" }
);

const execSync = require("child_process").execSync;
const chalk = require("chalk");

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

console.log(chalk.red("🚨 Removing VPC stack."));
exec(
  `npm run cdk -- destroy -f --all --require-approval never`,
  { cwd: "./vpc_stack/" }
);

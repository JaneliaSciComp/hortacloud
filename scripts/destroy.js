const execSync = require("child_process").execSync;

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

console.log("- Removing frontend.");
exec(`cdk destroy --require-approval never -c deploy=frontend`, {cwd: "./admin_api_stack/" });

console.log("- Removing backend.");
exec(`cdk destroy --require-approval never -c deploy=backend`, {cwd: "./admin_api_stack/" });

console.log("- Removing vpc.");
exec(`cdk destroy --require-approval never`, {cwd: "./vpc_stack/" });


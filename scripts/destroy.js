const execSync = require("child_process").execSync;

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE }  = process.env;

console.log("- Removing frontend.");
exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_website`, {cwd: "./admin_api_stack/" });

console.log("- Removing backend.");
exec(`npm run cdk -- destroy -f --require-approval never -c deploy=admin_api`, {cwd: "./admin_api_stack/" });

console.log("- Removing vpc.");
exec(`npm run cdk -- destroy -f --all --require-approval never`, {cwd: "./vpc_stack/" });

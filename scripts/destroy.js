const execSync = require("child_process").execSync;

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

const { HORTA_ORG, HORTA_STAGE }  = process.env;

/*
console.log("- Removing frontend.");
exec(`cdk destroy --require-approval never -c deploy=frontend`, {cwd: "./admin_api_stack/" });
*/

console.log("- Removing backend.");
exec(`npm run cdk -- destroy --require-approval never -c deploy=admin_api`, {cwd: "./admin_api_stack/" });

console.log("- Removing vpc.");
exec(`npm run cdk -- destroy -f ${HORTA_ORG}-hc-services-${HORTA_STAGE} ${HORTA_ORG}-hc-vpc-${HORTA_STAGE}`, {cwd: "./vpc_stack/" });


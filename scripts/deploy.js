const execSync = require("child_process").execSync;

const exec = (command, options={}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options};
  execSync(command, combinedOptions);
};

console.log("- Deploying VPC stack");
exec(`cleancdk -- deploy --require-approval never janelia-hc-services-prod janelia-hc-vpc-prod`, {cwd: "./admin_api_stack/" });

console.log("- Deploying web admin backend stack.");
exec(`cdk deploy --all --require-approval never -c deploy=backend`, {cwd: "./admin_api_stack/" });

console.log("- Generating web admin frontend config.");
exec(`node scripts/buildConfig.js`, { cwd: "./website" });

console.log("- Building web admin frontend.");
exec(`npm run build`, { cwd: "./website" });

console.log("- Deploying web admin frontend stack.");
exec(`cdk deploy --all --require-approval never -c deploy=frontend`, {cwd: "./admin_api_stack/" });

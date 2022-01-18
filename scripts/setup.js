const execSync = require("child_process").execSync;

const exec = command => {
  execSync(command, {
    stdio: [0, 1, 2]
  });
};

exec("npm install");
exec("npm install --prefix ./vpc_stack");
exec("npm install --prefix ./admin_api_stack");
exec("npm install --prefix ./admin_api_stack/user_list_resources");
exec("npm install --prefix ./website");

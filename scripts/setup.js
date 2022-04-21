const execSync = require("child_process").execSync;
const chalk = require("chalk");
const fs = require("fs");
const crypto = require("crypto");

const exec = (command, options = {}) => {
  const combinedOptions = { stdio: [0, 1, 2], ...options };
  execSync(command, combinedOptions);
};

const argv = require("yargs/yargs")(process.argv.slice(2))
  .usage("$0 [options]")
  .boolean(["i"])
  .describe(
    "i",
    "Install node modules."
  )
  .alias("i", "with-install").argv;

if (argv.withInstall) {
  console.log(chalk.cyan("🛠  Installing dependencies"));
  exec("npm install");
  exec("npm install --prefix ./vpc_stack");
  exec("npm install --prefix ./workstation_stack");
  exec("npm install --prefix ./admin_api_stack");
  exec("npm install --prefix ./admin_api_stack/user_list_resources");
  exec("npm install --prefix ./website");
}

// pre-populate the keys with openssl or javascript equivalent function
function generateSecrets() {
  console.log(chalk.cyan("🛠 Generating secret keys"));
  // open the .env file and replace all instances of <32 byte secret>
  fs.readFile(".env", "utf8", function (err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(
      /<32 byte secret>/g,
      () => crypto.randomBytes(32).toString("hex")
    );

    fs.writeFile(".env", result, "utf8", function (err) {
      if (err) return console.log(err);
      console.log(chalk.green("Secret keys created"));
    });
  });
}

// copy the env.template to .env if it is not present
console.log(chalk.cyan("🛠  Setting up .env file"));

fs.stat(".env", err => {
  if (err == null) {
    console.log(chalk.yellow(".env already exists. Skipping creation."));
  } else if (err.code === "ENOENT") {
    fs.copyFile("env.template", ".env", err => {
      if (err) {
        throw err;
      }
      console.log(chalk.green(".env was created"));
      generateSecrets();
    });
  } else {
    console.log(chalk.red("There was an error creating .env"), err.code);
  }
});

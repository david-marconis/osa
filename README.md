# osa (OpenShift Azure (Authentication))
OpenShift authentication via Azure made easy. A simple CLI tool to log into OpenShift clusters via Azure.

# How it works
This script will use a custom Chrome instance controlled by puppeteer which will navigate the login for you and automatically get the token needed to login.  
It will try to call the `oc login` command so ensure that you have the oc binary on your path.  
The cookies for the Microsoft/Azure login will be stored in your home directory in the folder: `~/.osa/profiles`. It will reuse the cookies for each time you run the command so you will only have to log in to Azure once in a while.

# Requirements
* node and npm, get it [here](https://nodejs.org/en/download/)
* oc binary, instructions on how to get it [here](https://docs.openshift.com/container-platform/4.11/cli_reference/openshift_cli/getting-started-cli.html#cli-installing-cli-web-console_cli-developer-commands)

# How to install
```bash
git clone git@github.com:david-marconis/osa.git # Clone this git repo
cd osa
npm install
npm link
```

# How to run
```
osa [clusterHostName]
```

# How to uninstall
```bash
npm r osa -g
rm -r ~/.osa # This will delete the azure cookies stored locally.
```

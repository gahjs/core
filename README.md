
# Welcome to gah!

<b>cli</b><br>
[![npm version](https://badge.fury.io/js/%40awdware%2Fgah.svg)](https://badge.fury.io/js/%40awdware%2Fgah) [![Build Status](https://dev.azure.com/loaderb0t/gah/_apis/build/status/gah?branchName=master)](https://dev.azure.com/loaderb0t/gah/_build/latest?definitionId=27&branchName=master) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=awdware_gah-cli&metric=alert_status)](https://sonarcloud.io/dashboard?id=awdware_gah-cli)
<br><b>shared</b><br>
[![npm version](https://badge.fury.io/js/%40awdware%2Fgah-shared.svg)](https://badge.fury.io/js/%40awdware%2Fgah-shared) [![Build Status](https://dev.azure.com/loaderb0t/gah/_apis/build/status/ci-gah-shared?branchName=master)](https://dev.azure.com/loaderb0t/gah/_build/latest?definitionId=29&branchName=master) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=awdware_gah&metric=alert_status)](https://sonarcloud.io/dashboard?id=awdware_gah)

`gah`provides tooling for working with decentralized, modular angular applications.

## Features
✅ Intuitive CLI for configuring modules, hosts, dependencies, plugins and more  
✅ Works with angular-CLI but is not strictly dependent on it  
✅ Generates a generic host for you  
✅ CI Support  
✅ Reload on save features fully supported for all dependencies  
✅ Pluggable: Write your own plugins to add project-specific functionality  
✅ Use from code: Run the `install` and `run` commands from nodeJS scripts or from build tools like grunt  

## Upcoming
🆕 Multi-Repository Support  

## Getting started
`gah` can be used both as a CLI tool and integrated into your node scripts or JS build systems [WIP].

### From CLI
To use the `gah`-cli install the `@awdware/gah` package globally.
```
// For yarn use
$ yarn global add @awdware/gah
// For npm use
$ npm i -g @awdware/gah
```
To get started you can generate an empty host with:
```
$ gah init --host
```
Navigate to your angular library containing the entry module. The entry module it the module that provides the basic structure of your application. Usually containing some sort of toolbar or menu and a `<router-outlet>` for the other modules. Initialize the entry module with the interactive CLI:
```
$ gah init --entry
```
If the entry module has dependencies on other modules, you have to initialize those modules now. THerfor navigate to the project folder containing the dependency. Beware that the entry module should only have dependencies to shared library modules that do not provide any routing or pages themselves, but rather have some common controls and services. You can initialize any module with the interactive `init` command.
```
$ gah init
```
Then in your entry module you can go ahead and add the dependency with the following interactive CLI command:
```
$ gah dependency add
```
To add modules to a host, you can use the `reference` command in the host folder.
```
$ gah reference add
```
If your setup is complete, you can go back to the host folder and install the previously configured dependencies:
```
$ gah install
```
If everything is configured correctly, you will now  be able to run the angular-cli commands for building or serving your application from the host folder, by using the `gah run` command:
```
$ gah run ng build --prod
```

### From Code
You can also use `gah install` and `gah run` from code. See the example below.
```TypeScript
// commonJS import style
const gah = require('@awdware/gah').gah;

// ES6 import style
import { gah } from '@awdware/gah';

await gah.install();

await gah.run('ng build');
```
Please note that all commands are executed for the current working directory of NodeJS. So for adding dependencies you first have to navigate to that folder and execute the commands there.

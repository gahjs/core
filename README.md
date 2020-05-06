
# Welcome to gah!

[![npm version](https://badge.fury.io/js/%40awdware%2Fgah-cli.svg)](https://badge.fury.io/js/%40awdware%2Fgah-cli) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gah&metric=alert_status)](https://sonarcloud.io/dashboard?id=gah) [![Build Status](https://dev.azure.com/loaderb0t/gah/_apis/build/status/awdware.gah?branchName=master)](https://dev.azure.com/loaderb0t/gah/_build/latest?definitionId=25&branchName=master)

`gah`  provides tooling for working with decentralized, modular angular applications.

## Features
✅ Intuitive CLI for configuring modules, hosts, dependencies, plugins and more
✅ Works with angular-CLI but is not strictly dependent on it
✅ Generates a generic host for you
✅ CI Support
✅ Reload on save features fully supported for all dependencies
✅ Pluggable: Write your own plugins to add project-specific functionality

## Upcoming
🆕 Multi-Repository Support
🆕 Code-API for usage in NodeJS scripts or build systems like grunt

## Features
`gah` can be used both as a CLI tool and integrated into your node scripts or JS build systems [WIP].

### CLI
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
If your setup is complete you can go back to the folder for the host and install the previously configured dependencies:
```
$ gah install
```
If everything is configured correctly, you will now  be able to run the angular-cli commands for building or serving your application from the host folder.


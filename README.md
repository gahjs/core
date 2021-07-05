
# Welcome to gah!
![npm (scoped)](https://img.shields.io/npm/v/@gah/cli?style=for-the-badge) ![Azure DevOps builds](https://img.shields.io/azure-devops/build/loaderb0t/3ce5d05a-5c08-4670-964e-03d678d3bbd6/27?style=for-the-badge) ![Sonar Quality Gate](https://img.shields.io/sonar/alert_status/gahjs_core?server=https%3A%2F%2Fsonarcloud.io&sonarVersion=8.8&style=for-the-badge)

`gah`provides tooling for working with decentralized, modular angular applications.

## ToC
- [Features](#features)
- [Upcoming](#upcoming)
- [Getting started](#getting-started)
  * [From CLI](#from-cli)
  * [From Code](#from-code)
- [Plugins](#plugins)


## Features
✅ Intuitive CLI for configuring modules, hosts, dependencies, plugins and more  
✅ Works with angular-CLI but is not strictly dependent on it  
✅ Generates a generic host for you  
✅ CI Support  
✅ Reload on save features fully supported for all dependencies  
✅ Pluggable: Write your own plugins to add project-specific functionality  
✅ Use from code: Run the `install` and `run` commands from NodeJS scripts or from build tools like grunt  

## Upcoming
🆕 Multi-Repository Support  
🆕 Using precompiled (npm) packages   

## Getting started
`gah` can be used both as a CLI tool and integrated into your NodeJS scripts or JS build systems.

### From CLI
To use the `gah`-cli install the `@gah/cli` package globally.
```
// For yarn use
$ yarn global add @gah/cli
// For npm use
$ npm i -g @gah/cli
```
To get started you can generate an empty host with:
```
$ gah host init
```
Navigate to your angular library containing the entry module. The entry module it the module that provides the basic structure of your application. Usually containing some sort of toolbar or menu and a `<router-outlet>` for the other modules. Initialize the entry module with the interactive CLI:
```
$ gah module init --entry
```
If the entry module has dependencies on other modules, you have to initialize those modules now. Therefore navigate to the project folder containing the dependency. Beware that the entry module should only have dependencies to shared library modules that do not provide any routing or pages themselves, but rather have some common controls and services. You can initialize any module with the interactive `module init` command.
```
$ gah module init
```
Then in your entry module you can go ahead and add the dependency with the following interactive CLI command:
```
$ gah module dependency add
```
To add modules to a host, you can use the `host module` command in the host folder.
```
$ gah host module add
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
const gah = require('@gah/cli').gah;

// ES6 import style
import { gah } from '@gah/cli';

await gah.install();

await gah.run('ng build');
```
Please note that all commands are executed for the current working directory of NodeJS. So for adding dependencies you first have to navigate to that folder and execute the commands there.

## Plugins
gah is plugable. To add a plugin utilize `gah plugin add [name]`. Plugins are npm packages.
The following Table contains some example plugins:

| package name                                                                    | description                                                                    |
|---------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| [gah-plugin-template](https://github.com/gahjs/gah-plugin-template)             | An empty example for a new plugin to get started.                              |
| [gah-angular-json-plugin](https://github.com/gahjs/gah-angular-json-plugin)     | Adjust the generated angular.json file                                         |
| [gah-ie11-plugin](https://github.com/gahjs/gah-ie11-plugin)                     | Make the generated application compatible with IE11                            |
| [gah-translation-merger](https://github.com/gahjs/gah-translation-merger)       | Merge multiple translation files into one (per language) eg. for ngx-translate |
| [gah-for-root-initializer](https://github.com/gahjs/gah-for-root-initializer)   | Call forRoot on selected NgModules instead of using their class name           |

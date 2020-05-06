#!/usr/bin/env node
import 'reflect-metadata';
import DIContainer from './di-container';

import { MainController } from './controller/main.controller';
import chalk from 'chalk';

const pjson = require('../package.json');
console.log(chalk.bold(chalk.whiteBright(`gah v${pjson.version}`)));

(async () => {
  DIContainer.load();
  const mainController: MainController = DIContainer.resolve<MainController>(MainController);
  try {
    // Cal main method
    await mainController.main();
  } catch (error) {
    console.error(chalk.red(' ■ ') + error);
    console.error(error);
    process.exit(1);
  }
})();

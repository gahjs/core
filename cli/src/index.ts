#!/usr/bin/env node
import 'reflect-metadata';
import DIContainer from './di-container';

import { MainController } from './controller/main.controller';
import chalk from 'chalk';
import path from 'path';
import { ContextService } from './services/context-service';

const pjson = require(path.join(__dirname, '../package.json'));
console.log(chalk.bold(chalk.whiteBright(`gah v${pjson.version}`)));

(async () => {
  DIContainer.load();
  const mainController: MainController = DIContainer.resolve<MainController>(MainController);

  DIContainer.get(ContextService).setContext({ calledFromCli: true });

  // Call main method
  await mainController.main();

})().catch(err => {
  console.log();
  console.error(chalk.red(' ■ ') + err);
  console.error(err);
  process.exit(1);
});

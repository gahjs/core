#!/usr/bin/env node
import 'reflect-metadata';
import DIContainer from './di-container';

import { MainController } from './controller/main.controller';
import chalk from 'chalk';
import path from 'path';
import { ContextService } from './services/context-service';

export const gahMain = async () => {

  const pjson = require(path.join(__dirname, '../package.json'));
  console.log(chalk.bold(chalk.whiteBright(`gah v${pjson.version}`)));
  let mainController: MainController;
  await (async () => {
    DIContainer.load();
    mainController = DIContainer.resolve<MainController>(MainController);

    DIContainer.get(ContextService).setContext({ calledFromCli: true });

    // Call main method
    await mainController.main();

  })().catch(err => {
    console.log();
    console.error(chalk.red(' ■ ') + err.message);
    if (mainController['_contextService'].getContext().debug) {
      console.log(err.stack);
    }
    try {
      mainController['_cleanupService'].cleanJsonFileTemporaryChanges();
    } catch (error) {
      console.error(`${chalk.red(' ■ ')}Error during json file cleanup. Please discard unwanted changes manually`);
    }
    process.exit(1);
  });
};

gahMain();

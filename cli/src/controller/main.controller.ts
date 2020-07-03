import { injectable, inject } from 'inversify';
import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';

import { InitController } from './init.controller';
import { DependencyController } from './dependency.controller';
import { InstallController } from './install.controller';
import { PluginController } from './plugin.controller';
import { Controller } from './controller';
import { HostModuleController } from './host-module.controller';
import { GahModuleType } from '@awdware/gah-shared';
import { CopyHost } from '../install-helper/copy-host';
import { RunController } from './run.controller';

@injectable()
export class MainController extends Controller {
  @inject(InitController)
  private readonly _initController: InitController;
  @inject(DependencyController)
  private readonly _dependencyController: DependencyController;
  @inject(HostModuleController)
  private readonly _hostModuleController: HostModuleController;
  @inject(InstallController)
  private readonly _installController: InstallController;
  @inject(PluginController)
  private readonly _pluginController: PluginController;
  @inject(RunController)
  private readonly _runController: RunController;

  public async main() {

    // TODO add flag or config or somehting
    this._loggerService.enableDebugLogging();

    if (this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._contextService.setContext({ calledFromHostFolder: true });
      CopyHost.copy(this._fileSystemService, this._workspaceService);
    }

    await this._pluginService.loadInstalledPlugins();

    var pjson = require(this._fileSystemService.join(__dirname, '../../package.json'));
    const version = pjson.version;

    // This is so useless, I love it.
    const fontWidth = process.stdout.columns > 111 ? 'full' : process.stdout.columns > 96 ? 'fitted' : 'controlled smushing';

    program.on('--help', () => {
      console.log(
        chalk.yellow(
          figlet.textSync('gah-cli v' + version, { horizontalLayout: fontWidth, font: 'Cricket', verticalLayout: 'full' })
        )
      );
    });
    console.log();

    program
      .version(version);

    program
      .command('init')
      .description('Initiates a new  module (or host).')
      .option('-h, --host', 'Initiates a host instead of a module')
      .option('-e, --entry', 'Initiates a module as the entry module')
      // .option('--moduleName <name>', 'The name for the new module')
      // .option('--facadeFolderPath <path>', 'The relative path to the facade files')
      // .option('--publicApiPath <path>', 'The relative path public api file (public-api.ts / index.ts / etc.)')
      // .option('--baseModuleName <name>', 'The name of the base NgModule of the new module')
      .action(async (cmdObj) => await this._initController.init(cmdObj.host, cmdObj.entry));

    const cmdDependency = program
      .command('dependency <add|remove> [options]');
    cmdDependency
      .command('add [moduleName] [dependencyConfigPath] [dependencyModuleNames...]')
      .description('Adds new dependencies to a specified module.')
      .action(async (moduleName, dependencyConfigPath, dependencyModuleNames) => await this._dependencyController.add(moduleName, dependencyConfigPath, dependencyModuleNames));
    cmdDependency
      .command('remove [moduleName]')
      .description('Removes dependencies from a specified module.')
      .action(async (moduleName) => await this._dependencyController.remove(moduleName));

    const cmdHostModule = program
      .command('module <add|remove> [options]')
      .description('Manages modules for the host');
    cmdHostModule
      .command('add [dependencyConfigPath] [dependencyModuleNames...]')
      .description('Adds a new module to the host.')
      .action(async (dependencyConfigPath, dependencyModuleNames) => await this._hostModuleController.add(dependencyConfigPath, dependencyModuleNames));
    cmdHostModule
      .command('remove [moduleName]')
      .description('Removes modules from the host.')
      .action(async (moduleName) => await this._hostModuleController.remove(moduleName));

    const cmdPlugin = program
      .command('plugin <add|remove|update> [options]');
    cmdPlugin
      .command('add [pluginName]')
      .description('Adds and installs a new plugin.')
      .action(async (pluginName) => await this._pluginController.add(pluginName));
    cmdPlugin
      .command('remove [pluginName]')
      .description('Removes and uninstalls a plugin.')
      .action(async (pluginName) => await this._pluginController.remove(pluginName));
    cmdPlugin
      .command('update [pluginName]')
      .description('Updates plugin to its newest version.')
      .action(async (pluginName) => await this._pluginController.update(pluginName));

    program
      .command('run  <command...>')
      .description('Executes a command.')
      .option('-e --environment <name>', 'The name of the environment that should be used')
      .allowUnknownOption()
      .action(async (command, cmdObj) => await this._runController.exec(command, cmdObj.environment));

    program
      .command('install')
      .description('Installs all dependencies.')
      .alias('i')
      .action(async () => this._installController.install());

    await program.parseAsync(process.argv);
  }


}

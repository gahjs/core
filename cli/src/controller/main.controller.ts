import { injectable, inject } from 'inversify';
import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';

import { InitController } from './init.controller';
import { DependencyController } from './dependency.controller';
import { InstallController } from './install.controller';
import { PluginController } from './plugin.controller';
import { Controller } from './controller';
import { HostModuleController } from './hostModule.controller';
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
    if (this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._contextService.setContext({ calledFromHostFolder: true });
      CopyHost.copy(this._fileSystemService, this._workspaceService);
    }

    // This sets the debug context variable depending on the used options
    this._contextService.setContext({ debug: process.argv.some(x => x === '--debug') });

    await this._pluginService.loadInstalledPlugins();

    var pjson = require(this._fileSystemService.join(__dirname, '../../package.json'));
    const version = pjson.version;

    // This is so useless, I love it.
    const fontWidth = process.stdout.columns > 111 ? 'full' : process.stdout.columns > 96 ? 'fitted' : 'controlled smushing';

    program.on('--help', () => {
      console.log(
        chalk.yellow(
          figlet.textSync(`gah-cli v${version}`, { horizontalLayout: fontWidth, font: 'Cricket', verticalLayout: 'full' })
        )
      );
    });
    console.log();

    program
      .version(version);

    program
      .option('--debug', 'Enables verbose debug logging');

    const cmdModule = program
      .command('module')
      .description('Several commands for working with a module');
    cmdModule
      .command('init')
      .description('Initiates a new module')
      .option('-e, --entry', 'Initiates a module as the entry module')
      .action(async (cmdObj) => this._initController.init(false, cmdObj.entry));
    const cmdModuleDependency = cmdModule
      .command('dependency')
      .description('A command for managing dependencies of a module');
    cmdModuleDependency
      .command('add')
      .description('Adds new dependencies to a module')
      .action(async () => this._dependencyController.add());
    cmdModuleDependency
      .command('remove')
      .description('Removes dependencies from a module')
      .action(async () => this._dependencyController.remove());

    const cmdHost = program
      .command('host')
      .description('Several commands for working with a host');
    cmdHost
      .command('init')
      .description('Initiates a new host')
      .action(async () => this._initController.init(true));
    const cmdHostModule = cmdHost
      .command('module')
      .description('A command for managing modules of a host');
    cmdHostModule
      .command('add')
      .description('Adds module to a host')
      .action(async () => this._hostModuleController.add());
    cmdHostModule
      .command('remove')
      .description('Removes a module from a host')
      .action(async () => this._hostModuleController.remove());

    const cmdPlugin = program
      .command('plugin <add|remove|update> [options]');
    cmdPlugin
      .command('add [pluginName]')
      .description('Adds and installs a new plugin.')
      .action(async (pluginName) => this._pluginController.add(pluginName));
    cmdPlugin
      .command('remove [pluginName]')
      .description('Removes and uninstalls a plugin.')
      .action(async (pluginName) => this._pluginController.remove(pluginName));
    cmdPlugin
      .command('update [pluginName]')
      .description('Updates plugin to its newest version.')
      .action(async (pluginName) => this._pluginController.update(pluginName));

    program
      .command('run  <command...>')
      .description('Executes a command.')
      .option('-e --environment <name>', 'The name of the environment that should be used')
      .allowUnknownOption()
      .action(async (command, cmdObj) => this._runController.exec(command, cmdObj.environment));

    program
      .command('install')
      .description('Installs all dependencies.')
      .alias('i')
      .action(async () => this._installController.install());

    await program.parseAsync(process.argv);
  }


}

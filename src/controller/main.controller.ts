import { injectable, inject } from 'inversify';
import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';

import { InitController } from './init.controller';
import { DependencyController } from './dependency.controller';
import { InstallController } from './install.controller';
import { GahPlugin, GahPluginDependencyConfig } from '@awdware/gah-shared';
import { PluginController } from './plugin.controller';
import { Controller } from './controller';

@injectable()
export class MainController extends Controller {
  @inject(InitController)
  private _initController: InitController;
  @inject(DependencyController)
  private _dependencyController: DependencyController;
  @inject(InstallController)
  private _installController: InstallController;
  @inject(PluginController)
  private _pluginController: PluginController;


  public async main() {

    if (this._configService.gahConfigExists()) {
      const cfg = this._configService.getGahConfig();
      if (cfg.plugins && cfg.plugins.length > 0) {
        for (const plugin of cfg.plugins) {
          await this.loadPlugin(plugin);
        }
      }
    }

    // const cmdDependency = new Command("dependency");
    // const cmdAdd = new Command("add");
    // const cmdAdd = new Command("add");

    // var pjson = require('../package.json');
    const version = '0.0.1';
    // const version = pjson.version;

    program.on('--help', () => {
      console.log(
        chalk.blue(
          figlet.textSync('gah-cli v ' + version, { horizontalLayout: 'full' })
        )
      );
    });

    program
      .version(version);

    program
      .command('init')
      .description('Initiates a new  module (or host).')
      .option('-h, --host', 'Initiates a host instead of a module')
      .option('-e, --entry', 'Initiates a module as the entry module')
      .action((cmdObj) => this._initController.init(cmdObj.host, cmdObj.entry));

    const cmdDependency = program
      .command('dependency <add|remove> [options]');
    cmdDependency
      .command('add [moduleName] [dependencyConfigPath] [dependencyModuleNames...]')
      .description('Adds new dependencies to a specified module.')
      .action(async (moduleName, dependencyConfigPath, dependencyModuleNames) => await this._dependencyController.add(moduleName, dependencyConfigPath, dependencyModuleNames));
    cmdDependency
      .command('remove [moduleName]')
      .description('Adds new dependencies to a specified module.')
      .action(async (moduleName) => await this._dependencyController.remove(moduleName));

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
      .command('install')
      .description('Installs all dependencies.')
      .alias('i')
      .action(async () => await this._installController.install());

    program.parse(process.argv);
  }

  async loadPlugin(pluginDepCfg: GahPluginDependencyConfig) {
    const success = this.tryLoadPlugin(pluginDepCfg);
    if (!success) {
      this._loggerService.log('Plugin ' + pluginDepCfg.name + ' has not been installed');
      await this._pluginService.installPlugin(pluginDepCfg.name).then(success => {
        if (!success) {
          throw new Error(`Could not load plugin ${pluginDepCfg.name}`);
        }
      });
    }
    this._loggerService.log(`Plugin '${pluginDepCfg.name}' loaded.`);
  }

  private tryLoadPlugin(pluginDepCfg: GahPluginDependencyConfig): boolean {
    try {
      const pluginDefinition = require(this._fileSystemService.join(process.cwd(), 'node_modules', pluginDepCfg.name));
      const plugin = new pluginDefinition.default();
      this._pluginService.registerPlugin(plugin as GahPlugin, pluginDepCfg);
    } catch (error) {
      this._loggerService.debug(error);
      return false;
    }
    return true;
  }
}

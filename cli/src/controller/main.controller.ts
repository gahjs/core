import { injectable, inject } from 'inversify';
import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';
import compareVersions from 'compare-versions';

import { InitController } from './init.controller';
import { DependencyController } from './dependency.controller';
import { InstallController } from './install.controller';
import { PluginController } from './plugin.controller';
import { Controller } from './controller';
import { HostModuleController } from './hostModule.controller';
import { GahModuleType } from '@awdware/gah-shared';
import { RunController } from './run.controller';
import { WhyController } from './why.controller';
import { TidyController } from './tidy.controler';
import { CleanController } from './clean.controller';
import { GitService } from '../services/git.service';

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
  @inject(TidyController)
  private readonly _tidyController: TidyController;
  @inject(WhyController)
  private readonly _whyController: WhyController;
  @inject(CleanController)
  private readonly _cleanController: CleanController;
  @inject(GitService)
  private readonly _gitService: GitService;

  private readonly _version: string;

  constructor() {
    super();
    const pjson = require(this._fileSystemService.join(__dirname, '../../package.json'));
    this._version = pjson.version;
  }

  public async main() {
    if (this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._contextService.setContext({ calledFromHostFolder: true });
      this._contextService.setContext({ currentBaseFolder: this._fileSystemService.join(process.cwd(), '.gah') });
    } else {
      this._contextService.setContext({ currentBaseFolder: process.cwd() });
    }

    // This sets the debug context variable depending on the used options
    this._contextService.setContext({ debug: process.argv.some(x => x === '--debug') });
    this._contextService.setContext({ skipScripts: process.argv.some(x => x === '--skipScripts') });

    this._loggerService.debug(`Environment Vars: \n${chalk.greenBright(Object.keys(process.env).map(x => `\n${x}:${process.env[x]}`))}\n`);

    await this.checkForUpdates();

    this._loggerService.debug(`WORKSPACE HASH: ${chalk.red(this._workspaceService.getWorkspaceHash())}`);

    await this._gitService.init();

    await this._pluginService.loadInstalledPlugins();

    // This is so useless, I love it.
    const fontWidth = process.stdout.columns > 111 ? 'full' : process.stdout.columns > 96 ? 'fitted' : 'controlled smushing';

    program.on('--help', () => {
      console.log(
        chalk.yellow(
          figlet.textSync(`gah-cli v${this._version}`, { horizontalLayout: fontWidth, font: 'Cricket', verticalLayout: 'full' })
        )
      );
    });
    console.log();

    program
      .version(this._version);

    program
      .option('--debug', 'Enables verbose debug logging')
      .option('--skipScripts', 'Skips pre and post install scripts');

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
      .command('plugin <add|remove|update|run> [options]');
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
    cmdPlugin
      .command('run <command...>')
      .description('Runs a custom command from a plugin.')
      .action(async (command: string[]) => this._pluginController.run(command));

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

    const cmdWhy = program
      .command('why <module|package>')
      .description('Why is something there?');
    cmdWhy
      .command('module <name>')
      .description('Why is this module referenced?')
      .action(async (name) => this._whyController.whyModule(name));
    cmdWhy
      .command('package <name>')
      .description('Why is this package there?')
      .action(async (name) => this._whyController.whyPackage(name));

    const cmdTidy = program
      .command('tidy <packages>')
      .description('Tidy up your modules.');
    cmdTidy
      .command('packages')
      .description('Tidies up the packages of your modules.')
      .action(async () => this._tidyController.tidyPackages());

    const cmdClean = program
      .command('clean <targets...>')
      .helpOption('targets', 'One or multiple of: \'packages\', \'tsconfig\'')
      .description('Cleans your workspace before commit')
      .action(async (targets: string[]) => {
        const invalid = targets.some(x => x.toLowerCase() !== 'tsconfig' && x.toLowerCase() !== 'packages');
        if (invalid) {
          this._loggerService.error('Invalid parameter');
          return;
        }
        const cleanPackages = targets.some(x => x.toLowerCase() === 'packages');
        const cleanTsConfig = targets.some(x => x.toLowerCase() === 'tsconfig');
        return this._cleanController.clean(cleanPackages, cleanTsConfig);
      });

    await program.parseAsync(process.argv);
  }


  private async checkForUpdates() {
    const gahData = this._workspaceService.getGlobalData();
    let checkNewVersion = false;
    if (gahData.lastUpdateCheck) {
      const hoursPassed = Math.abs(new Date().getTime() - new Date(gahData.lastUpdateCheck).getTime()) / 36e5;
      if (hoursPassed > 1 || !gahData.latestGahVersion) {
        checkNewVersion = true;
      }
    } else {
      checkNewVersion = true;
    }

    if (checkNewVersion) {
      try {
        const latestVersion = await this._packageService.findLatestPackageVersion('@awdware/gah');
        gahData.latestGahVersion = latestVersion;
        gahData.lastUpdateCheck = new Date();
      } catch (error) {
        // Ignore error
      }
    }

    if (!gahData.latestGahVersion) {
      return;
    }

    if (compareVersions(gahData.latestGahVersion, this._version) === 1) {
      this._loggerService.warn('  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *');
      this._loggerService.warn(`  *               ${chalk.green('A new version of gah is available.')}                  *`);
      this._loggerService.warn(`  *        Please install it via ${chalk.gray('yarn global add @awdware/gah')}         *`);
      this._loggerService.warn('  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *');
    }

    this._workspaceService.saveGlobalGahData(gahData);
  }

}

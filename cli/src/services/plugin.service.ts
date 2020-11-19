import { injectable } from 'inversify';

import {
  GahEventHandler, GahPlugin, GahEvent, IPluginService, GahPluginDependencyConfig, GahCommandHandler,
  IExecutionService, IWorkspaceService, IPromptService, ITemplateService, IConfigurationService,
  ILoggerService, IFileSystemService, IContextService, PlguinUpdate, GahEventType, ExtractEventPayload, PackageJson
} from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';
import { LoggerService } from './logger.service';
import { ConfigService } from './config.service';
import { TemplateService } from './template.service';
import { PromptService } from './prompt.service';
import { WorkspaceService } from './workspace.service';
import { ExecutionService } from './execution.service';
import { ContextService } from './context-service';
import DIContainer from '../di-container';
import chalk from 'chalk';

@injectable()
export class PluginService implements IPluginService {

  private readonly _plugins = new Array<GahPlugin>();
  private readonly _eventHandlers = new Array<GahEventHandler<any>>();
  private readonly _commandHandlers = new Array<GahCommandHandler>();
  private readonly _pluginFolder: string;
  private readonly _pluginPackageJson: string;

  public pluginNames: { name: string, version: string }[] = [];

  private readonly _fileSystemService: IFileSystemService;
  private readonly _loggerService: ILoggerService;
  private readonly _configService: IConfigurationService;
  private readonly _templateService: ITemplateService;
  private readonly _promptService: IPromptService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _executionService: IExecutionService;
  private readonly _contextService: IContextService;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
    this._configService = DIContainer.get(ConfigService);
    this._templateService = DIContainer.get(TemplateService);
    this._promptService = DIContainer.get(PromptService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._executionService = DIContainer.get(ExecutionService);
    this._contextService = DIContainer.get(ContextService);

    this._pluginFolder = this._fileSystemService.join(this._workspaceService.getWorkspaceFolder(), 'plugins');
    this._fileSystemService.ensureDirectory(this._pluginFolder);
    this._pluginPackageJson = this._fileSystemService.join(this._pluginFolder, 'package.json');
    if (!this._fileSystemService.fileExists(this._pluginPackageJson)) {
      const packageJsonTemplatePath = this._fileSystemService.join(__dirname, '..', '..', 'assets', 'plugins', 'package.json');
      this._fileSystemService.copyFile(packageJsonTemplatePath, this._pluginFolder);
    }
  }

  public isPluginConfigured(pluginName: string): boolean {
    if (!this._configService.gahConfigExists()) {
      return false;
    }
    const cfg = this._configService.getPartialGahConfig();
    if (!cfg.plugins || cfg.plugins.length === 0) {
      return false;
    }
    return cfg.plugins.some(x => x.name === pluginName);
  }

  private initPluginServices(plugin: GahPlugin) {
    plugin['fileSystemService'] = this._fileSystemService;
    plugin['loggerService'] = this._loggerService;
    plugin['configurationService'] = this._configService;
    plugin['templateService'] = this._templateService;
    plugin['promptService'] = this._promptService;
    plugin['workspaceService'] = this._workspaceService;
    plugin['executionService'] = this._executionService;
    plugin['pluginService'] = this;
  }


  public async loadInstalledPlugins(): Promise<void> {
    if (!this._configService.gahConfigExists()) {
      return;
    }
    const cfg = this._configService.getGahConfig();
    if (!cfg.plugins || cfg.plugins.length < 1) {
      return;
    }
    for (const pluginCfg of cfg.plugins) {
      const plugin = await this.ensurePluginIsInstalled(pluginCfg);
      this.registerPlugin(plugin, pluginCfg);
    }
  }

  private registerPlugin(plugin: GahPlugin, pluginDepCfg: GahPluginDependencyConfig) {
    plugin.config = pluginDepCfg.settings;
    this.initPluginServices(plugin);
    if (plugin.config.enabled === undefined || plugin.config.enabled) {
      plugin.onInit();
      this._plugins.push(plugin);
      this._loggerService.debug(`loaded plugin ${chalk.magenta(pluginDepCfg.name)}`);
    } else {
      this._loggerService.debug(`plugin ${pluginDepCfg.name} is disabled`);
    }
  }

  private async ensurePluginIsInstalled(pluginDepCfg: GahPluginDependencyConfig): Promise<GahPlugin> {
    let plugin = await this.tryLoadInstalledPlugin(pluginDepCfg.name, pluginDepCfg.version);
    if (plugin) {
      return plugin;
    }

    const success = await this.doInstallPlugin(pluginDepCfg.name, pluginDepCfg.version);
    if (!success) {
      throw new Error('Failed');
    }
    plugin = await this.tryLoadInstalledPlugin(pluginDepCfg.name, pluginDepCfg.version);
    if (plugin) {
      return plugin;
    }

    throw new Error('Failed');
  }

  private async tryLoadInstalledPlugin(pluginName: string, pluginVersion?: string): Promise<GahPlugin | undefined> {
    const cfg = this._configService.getGahConfig();
    if (!cfg?.plugins?.some(x => x.name === pluginName)) {
      this._loggerService.debug(`Plugin ${pluginName} not yet specified in gah config`);
      return undefined;
    }

    const pluginPkgJsonPath = this._fileSystemService.join(this._pluginFolder, 'package.json');
    const pluginPkgJson = this._fileSystemService.parseFile<PackageJson>(pluginPkgJsonPath);
    if (!pluginPkgJson || !pluginPkgJson.devDependencies || !pluginPkgJson.devDependencies[pluginName]) {
      return;
    }

    const actualPluginVersion = pluginPkgJson.devDependencies[pluginName];

    if (pluginVersion && pluginVersion !== actualPluginVersion) {
      return;
    }

    const pluginFolderPath = this._fileSystemService.join(this._pluginFolder, 'node_modules', pluginName);

    if (!this._fileSystemService.fileExists(pluginFolderPath)) {
      this._loggerService.debug(`Cannot find plugin folder at ${pluginFolderPath}`);
      return undefined;
    }

    const importFileName = this.calculatePluginImportFileName(pluginName);
    if (!this._fileSystemService.fileExists(importFileName)) {
      const importFileContent = `exports.PluginType = require("${pluginName}").default;`;
      this._fileSystemService.saveFile(importFileName, importFileContent);
    }

    try {
      const pluginModule = require(importFileName);
      const plugin = new pluginModule.PluginType() as GahPlugin;
      return plugin;
    } catch (error) {
      this._loggerService.debug('Plugin package folder exists, but import failed');
      this._loggerService.debug(error);
      return undefined;
    }
  }

  private calculatePluginImportFileName(pluginName: string) {
    return this._fileSystemService.join(this._pluginFolder, `${pluginName.replace(/\//g, '_')}.js`);
  }

  private async checkPlugin(plugin: GahPlugin, pluginName: string) {
    if (!plugin.onInit || !plugin['registerEventListener'] || !plugin.onInstall || !plugin['name']) {
      if (!plugin.onInit) { this._loggerService.debug('Plugin doesn\'t implement onInit method'); }
      if (!plugin['registerEventListener']) { this._loggerService.debug('Plugin doesn\'t implement registerEventListener method'); }
      if (!plugin.onInstall) { this._loggerService.debug('Plugin doesn\'t implement onInstall method'); }
      if (!plugin['name']) { this._loggerService.debug('Plugin doesn\'t call super constructor with the plugin name'); }
      return false;
    }
    this.initPluginServices(plugin);

    const cfg = this._configService.getPartialGahConfig();
    const pluginCfg = cfg.plugins!.find(x => x.name === pluginName)!;

    this._loggerService.log(`Starting settings configuration for '${pluginName}'`);
    pluginCfg.settings = await plugin.onInstall(pluginCfg.settings);
    this._loggerService.log('Plugin settings configuration finished');
    this._configService.saveGahConfig();

    return true;
  }

  public async doInstallPlugin(pluginName: string, pluginVersion?: string): Promise<boolean> {
    this._loggerService.startLoadingAnimation('Downloading Plugin');
    const pluginVersionOrEmpty = pluginVersion ? `@${pluginVersion}` : '';
    const success = await this._executionService.execute(`yarn add ${pluginName}${pluginVersionOrEmpty} -D -E`, false, undefined, this._pluginFolder);
    if (!success) {
      this._loggerService.stopLoadingAnimation(false, false, 'Downloading Plugin failed (check the package name again)');
      return false;
    }
    this._loggerService.stopLoadingAnimation(false, true, 'Downloading Plugin succeeded');

    await this.saveChangesToGahConfig(pluginName);
    return true;
  }

  private async saveChangesToGahConfig(pluginName: string) {
    const cfg = this._configService.getPartialGahConfig();
    let pluginCfg: GahPluginDependencyConfig;

    cfg.plugins ??= new Array<GahPluginDependencyConfig>();

    if (cfg.plugins.some(x => x.name === pluginName)) {
      pluginCfg = cfg.plugins.find(x => x.name === pluginName)!;
    } else {
      pluginCfg = new GahPluginDependencyConfig();
    }
    pluginCfg.name = pluginName!;

    const vOut = this._executionService.executionResult;
    const versionRegex = new RegExp(`${pluginName}@([\\w\\d.-]+)$`, 'm');
    const v = vOut.match(versionRegex)?.[1];
    if (!v) {
      throw Error('Could not find version of the newly installed plugin');
    }
    pluginCfg.version = v;

    if (!cfg.plugins.some(x => x.name === pluginName)) {
      cfg.plugins.push(pluginCfg);
    }
    this._configService.saveGahConfig();

    return pluginCfg;
  }

  triggerEvent<T extends GahEventType>(type: T, payload: Omit<ExtractEventPayload<GahEvent, T>, 'type'>): void {
    this._loggerService.debug(`Event '${type}' fired`);
    this._eventHandlers.forEach(handler => {
      if (handler.eventType === type) {
        this._loggerService.debug(`Calling handler '${handler.pluginName}'`);
        try {
          handler.handler(payload);
        } catch (error) {
          this._loggerService.error(`Error in plugin ${handler.pluginName}.\nCallstack from plugin:`);
          this._loggerService.error(error);
          this._loggerService.log('--------------------------------------------------------------------------------');
          this._loggerService.log('Trying to continue with execution...\n');
        }
      }
    });
  }

  registerEventHandler<T extends GahEventType>(pluginName: string, type: T, handler: (payload: Omit<ExtractEventPayload<GahEvent, T>, 'type'>) => void): void {
    const newHandler = new GahEventHandler<T>();
    newHandler.pluginName = pluginName;
    newHandler.eventType = type;
    newHandler.handler = handler;
    this._eventHandlers.push(newHandler);
  }

  public async installPlugin(pluginName: string): Promise<boolean> {
    let plugin = await this.tryLoadInstalledPlugin(pluginName);
    if (!plugin) {
      const success = await this.doInstallPlugin(pluginName);
      if (!success) {
        throw new Error('Failed to install the plugin');
      }
      plugin = await this.tryLoadInstalledPlugin(pluginName);
    }
    if (!plugin) {
      throw new Error('Failed to install the plugin');
    }
    return this.checkPlugin(plugin, pluginName);
  }

  public async removePlugin(pluginName: string): Promise<boolean> {
    this._loggerService.startLoadingAnimation(`Uninstalling plugin: ${pluginName}`);

    const cfg = this._configService.getPartialGahConfig();
    const idx = cfg.plugins?.findIndex(x => x.name === pluginName) ?? -1;
    if (idx === -1) { throw new Error(`Error uninstalling plugin ${pluginName}`); }

    cfg.plugins?.splice(idx, 1);
    this._configService.saveGahConfig();

    const success = await this._executionService.execute(`yarn remove ${pluginName}`, false, undefined, this._pluginFolder);
    if (success) {
      const pluginFileName = this.calculatePluginImportFileName(pluginName);
      if (this._fileSystemService.fileExists(pluginFileName)) {
        this._fileSystemService.deleteFile(pluginFileName);
      }

      this._loggerService.stopLoadingAnimation(false, true, `Plugin '${pluginName}' has been uninstalled.`);
      return true;
    } else {
      this._loggerService.stopLoadingAnimation(false, false, `Uninstalling plugin '${pluginName}' failed!`);
      this._loggerService.error(this._executionService.executionErrorResult);
      return false;
    }
  }


  public async getUpdateablePlugins(pluginName?: string): Promise<PlguinUpdate[] | null> {
    const cfg = this._configService.getPartialGahConfig();
    if (!cfg.plugins) {
      this._loggerService.log('No plugins installed!');
      return null;
    }

    const searchForPlugins = pluginName ?? cfg.plugins.map(x => x.name).join(' ');

    this._loggerService.startLoadingAnimation('Searching for plugin updates');
    await this._executionService.execute(`yarn outdated ${searchForPlugins}`, false, undefined, this._pluginFolder);
    const yarnOutput = this._executionService.executionResult;
    const updates = new Array<PlguinUpdate>();
    yarnOutput.split('\n').forEach(yarnOutputLine => {
      const updateMatches = yarnOutputLine.match(/^(\S+)\s(\d+.\d+.\d+)\s+(\d+.\d+.\d+)\s+(\d+.\d+.\d+)\s+/);
      if (!updateMatches) { return; }
      updates.push({ name: updateMatches[1], fromVersion: updateMatches[2], toVersion: updateMatches[4] });
    });
    if (updates.length === 0) {
      this._loggerService.stopLoadingAnimation(false, true, 'No updates found.');
      return null;
    }
    this._loggerService.stopLoadingAnimation(false, true, 'Updates found.');
    updates.forEach(u => {
      this._loggerService.log(`${u.name} can be updated from version ${u.fromVersion} to version ${u.toVersion}`);
    });
    return updates;
  }

  public async updatePlugins(pluginUpdates: PlguinUpdate[]) {
    this._loggerService.startLoadingAnimation('Updating plugins');
    const success = await this._executionService.execute(`yarn add ${pluginUpdates.map(x => x.name).join(' ')} -D -E`, false, undefined, this._pluginFolder);
    if (success) {
      this._loggerService.stopLoadingAnimation(false, true, 'Updated plugins');
    } else {
      this._loggerService.stopLoadingAnimation(false, false, 'Updating plugin(s) failed');
      throw new Error(`Updating plugin(s) failed\n${this._executionService.executionErrorResult}`);
    }
    const gahCfg = this._configService.getPartialGahConfig();
    pluginUpdates.forEach(pluginUpdate => {
      const plugin = gahCfg.plugins?.find(x => x.name === pluginUpdate.name);
      plugin!.version = pluginUpdate.toVersion;
    });
    this._configService.saveGahConfig();
  }

  registerCommandHandler(pluginName: string, commandName: string, handler: (args: string[]) => Promise<boolean>): void {
    const newHandler = new GahCommandHandler();
    newHandler.pluginName = pluginName;
    newHandler.command = commandName;
    newHandler.handler = handler;
    this._commandHandlers.push(newHandler);
  }

  async run(cmd: string, args: string[]): Promise<boolean> {
    const cmdHandler = this._commandHandlers.find(x => x.command === cmd);
    if (!cmdHandler) {
      this._loggerService.error(`The command '${chalk.yellow(cmd)}' cannot be found`);
      return false;
    }
    this._loggerService.debug(`executing command '${chalk.yellow(cmd)}' from '${chalk.yellow(cmdHandler.pluginName)}'`);
    return cmdHandler.handler(args);
  }
}

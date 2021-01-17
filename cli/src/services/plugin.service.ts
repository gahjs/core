import { injectable } from 'inversify';

import {
  GahEventHandler, GahPlugin, GahEvent, IPluginService, GahPluginDependencyConfig, GahCommandHandler,
  IExecutionService, IWorkspaceService, IPromptService, ITemplateService, IConfigurationService,
  ILoggerService, IFileSystemService, PlguinUpdate, GahEventType, ExtractEventPayload, PackageJson
} from '@gah/shared';

import { FileSystemService } from './file-system.service';
import { LoggerService } from './logger.service';
import { ConfigService } from './config.service';
import { TemplateService } from './template.service';
import { PromptService } from './prompt.service';
import { WorkspaceService } from './workspace.service';
import { ExecutionService } from './execution.service';
import { DIContainer } from '../di-container';
import chalk from 'chalk';

@injectable()
export class PluginService implements IPluginService {

  private readonly _plugins = new Array<GahPlugin>();
  private readonly _eventHandlers = new Array<GahEventHandler<any>>();
  private readonly _commandHandlers = new Array<GahCommandHandler>();
  private _pluginFolder: string;
  private _pluginPackageJson: string;

  public pluginNames: { name: string, version: string }[] = [];

  private readonly _fileSystemService: IFileSystemService;
  private readonly _loggerService: ILoggerService;
  private readonly _configService: IConfigurationService;
  private readonly _templateService: ITemplateService;
  private readonly _promptService: IPromptService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _executionService: IExecutionService;
  private readonly _pluginData: { [pluginName: string]: { [key: string]: any } } = {};

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
    this._configService = DIContainer.get(ConfigService);
    this._templateService = DIContainer.get(TemplateService);
    this._promptService = DIContainer.get(PromptService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._executionService = DIContainer.get(ExecutionService);
  }

  public async init(): Promise<void> {
    this._pluginFolder = this._fileSystemService.join(this._workspaceService.getWorkspaceFolder(), 'plugins');
    this._pluginPackageJson = this._fileSystemService.join(this._pluginFolder, 'package.json');

    await this._fileSystemService.ensureDirectory(this._pluginFolder);
    if (!await this._fileSystemService.fileExists(this._pluginPackageJson)) {
      const packageJsonTemplatePath = this._fileSystemService.join(__dirname, '..', '..', 'assets', 'plugins', 'package.json');
      await this._fileSystemService.copyFile(packageJsonTemplatePath, this._pluginFolder);
    }
  }

  public async isPluginConfigured(pluginName: string): Promise<boolean> {
    const cfg = await this._configService.getCurrentConfig();
    if (!cfg?.plugins || cfg.plugins.length === 0) {
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
    const cfg = await this._configService.getGahConfig();
    if (!cfg?.plugins || cfg.plugins.length < 1) {
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
    let { plugin } = await this.tryLoadInstalledPlugin(pluginDepCfg.name, pluginDepCfg.version) ?? { plugin: undefined };
    if (plugin) {
      return plugin;
    }

    const success = await this.doInstallPlugin(pluginDepCfg.name, pluginDepCfg.version);
    if (!success) {
      throw new Error('Failed');
    }
    plugin ??= (await this.tryLoadInstalledPlugin(pluginDepCfg.name, pluginDepCfg.version))?.plugin;
    if (plugin) {
      return plugin;
    }

    throw new Error('Failed');
  }

  private async tryLoadInstalledPlugin(pluginName: string, pluginVersion?: string): Promise<{ plugin: GahPlugin, version: string } | undefined> {
    const cfg = await this._configService.getGahConfig();
    if (!cfg?.plugins?.some(x => x.name === pluginName)) {
      this._loggerService.debug(`Plugin ${pluginName} not yet specified in gah config`);
      return undefined;
    }

    const pluginPkgJsonPath = this._fileSystemService.join(this._pluginFolder, 'package.json');
    const pluginPkgJson = await this._fileSystemService.parseFile<PackageJson>(pluginPkgJsonPath);
    if (!pluginPkgJson || !pluginPkgJson.devDependencies || !pluginPkgJson.devDependencies[pluginName]) {
      return undefined;
    }

    const actualPluginVersion = pluginPkgJson.devDependencies[pluginName];

    if (pluginVersion && pluginVersion !== actualPluginVersion) {
      return undefined;
    }

    const pluginFolderPath = this._fileSystemService.join(this._pluginFolder, 'node_modules', pluginName);

    if (!await this._fileSystemService.fileExists(pluginFolderPath)) {
      this._loggerService.debug(`Cannot find plugin folder at ${pluginFolderPath}`);
      return undefined;
    }

    const importFileName = this.calculatePluginImportFileName(pluginName);
    if (!await this._fileSystemService.fileExists(importFileName)) {
      const importFileContent = `exports.PluginType = require("${pluginName}").default;`;
      await this._fileSystemService.saveFile(importFileName, importFileContent);
    }

    try {
      const pluginModule = require(importFileName);
      const plugin = new pluginModule.PluginType();
      return { plugin: plugin as GahPlugin, version: actualPluginVersion };
    } catch (error) {
      this._loggerService.error('Plugin package folder exists, but import failed');
      this._loggerService.error(error);
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

    const cfg = await this._configService.getCurrentConfig();
    const pluginCfg = cfg.plugins!.find(x => x.name === pluginName)!;

    this._loggerService.log(`Starting settings configuration for '${pluginName}'`);
    pluginCfg.settings = await plugin.onInstall(pluginCfg.settings);
    this._loggerService.log('Plugin settings configuration finished');
    await this._configService.saveCurrentConfig();

    return true;
  }

  public async doInstallPlugin(
    pluginName: string,
    pluginVersion?: string,
    saveChangesToConfig: boolean = false,
    skipDownload: boolean = false,
    downloadedVersion?: string
  ): Promise<boolean> {
    if (!skipDownload) {
      this._loggerService.startLoadingAnimation('Downloading Plugin');
      const pluginVersionOrEmpty = pluginVersion ? `@${pluginVersion}` : '';
      const success = await this._executionService.execute(`yarn add ${pluginName}${pluginVersionOrEmpty} -D -E`, false, undefined, this._pluginFolder);
      if (!success) {
        this._loggerService.stopLoadingAnimation(false, false, 'Downloading Plugin failed (check the package name again)');
        return false;
      }
      this._loggerService.stopLoadingAnimation(false, true, 'Downloading Plugin succeeded');
    }
    if (saveChangesToConfig) {
      await this.saveChangesToGahConfig(pluginName, downloadedVersion);
    }
    return true;
  }

  private async saveChangesToGahConfig(pluginName: string, downloadedVersion?: string) {
    const cfg = await this._configService.getCurrentConfig();
    let pluginCfg: GahPluginDependencyConfig;

    cfg.plugins ??= new Array<GahPluginDependencyConfig>();

    if (cfg.plugins.some(x => x.name === pluginName)) {
      pluginCfg = cfg.plugins.find(x => x.name === pluginName)!;
    } else {
      pluginCfg = new GahPluginDependencyConfig();
    }
    pluginCfg.name = pluginName!;

    if (downloadedVersion) {
      pluginCfg.version = downloadedVersion;
    } else {
      const vOut = this._executionService.executionResult;
      const versionRegex = new RegExp(`${pluginName}@([\\w\\d.-]+)$`, 'm');
      const v = vOut.match(versionRegex)?.[1];
      if (!v) {
        throw Error('Could not find version of the newly installed plugin');
      }
      pluginCfg.version = v;
    }

    if (!cfg.plugins.some(x => x.name === pluginName)) {
      cfg.plugins.push(pluginCfg);
    }
    await this._configService.saveCurrentConfig();

    return pluginCfg;
  }

  async triggerEvent<T extends GahEventType>(type: T, payload: ExtractEventPayload<GahEvent, T>): Promise<void> {
    this._loggerService.debug(`Event '${type}' fired`);
    for (const handler of this._eventHandlers) {
      if (handler.eventType === type) {
        this._loggerService.debug(`Calling handler '${handler.pluginName}'`);
        try {
          await handler.handler(payload);
        } catch (error) {
          this._loggerService.error(`Error in plugin ${handler.pluginName}.\nCallstack from plugin:`);
          this._loggerService.error(error);
          this._loggerService.log('--------------------------------------------------------------------------------');
          this._loggerService.log('Trying to continue with execution...\n');
          return;
        }
      }
    }
  }

  registerEventHandler<T extends GahEventType>(pluginName: string, type: T, handler: (payload: ExtractEventPayload<GahEvent, T>) => Promise<void> | void): void {
    const newHandler = new GahEventHandler<T>();
    newHandler.pluginName = pluginName;
    newHandler.eventType = type;
    newHandler.handler = handler;
    this._eventHandlers.push(newHandler);
  }

  public async installPlugin(pluginName: string): Promise<boolean> {
    const pluginRes = await this.tryLoadInstalledPlugin(pluginName);
    let plugin = pluginRes?.plugin;
    const success = await this.doInstallPlugin(pluginName, undefined, true, !!plugin, pluginRes?.version);
    if (!success) {
      throw new Error('Failed to install the plugin');
    }
    plugin ??= (await this.tryLoadInstalledPlugin(pluginName))?.plugin;
    if (!plugin) {
      throw new Error('Failed to install the plugin');
    }
    return this.checkPlugin(plugin, pluginName);
  }

  public async removePlugin(pluginName: string): Promise<boolean> {
    this._loggerService.startLoadingAnimation(`Uninstalling plugin: ${pluginName}`);

    const cfg = await this._configService.getCurrentConfig();
    const idx = cfg.plugins?.findIndex(x => x.name === pluginName) ?? -1;
    if (idx === -1) { throw new Error(`Error uninstalling plugin ${pluginName}`); }

    cfg.plugins?.splice(idx, 1);
    await this._configService.saveCurrentConfig();

    const success = await this._executionService.execute(`yarn remove ${pluginName}`, false, undefined, this._pluginFolder);
    if (success) {
      const pluginFileName = this.calculatePluginImportFileName(pluginName);
      if (await this._fileSystemService.fileExists(pluginFileName)) {
        await this._fileSystemService.deleteFile(pluginFileName);
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
    const cfg = await this._configService.getCurrentConfig();
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
    const gahCfg = await this._configService.getCurrentConfig();
    pluginUpdates.forEach(pluginUpdate => {
      const plugin = gahCfg.plugins?.find(x => x.name === pluginUpdate.name);
      plugin!.version = pluginUpdate.toVersion;
    });
    await this._configService.saveCurrentConfig();
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

  public storeData<T>(pluginName: string, key: string, data: T): void {
    this._pluginData[pluginName] ??= {};
    this._pluginData[pluginName][key] = data;
  }

  public readData<T>(pluginName: string, key: string): T {
    return this._pluginData[pluginName]?.[key];
  }
}

import { injectable, inject } from 'inversify';

import { GahEventHandler, GahPlugin, GahEventPayload, GahEvent, IPluginService, GahPluginDependencyConfig, PackageJson, IExecutionService, IWorkspaceService, IPromptService, ITemplateService, IConfigurationService, ILoggerService, IFileSystemService } from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';
import { LoggerService } from './logger.service';
import { ConfigService } from './config.service';
import { TemplateService } from './template.service';
import { PromptService } from './prompt.service';
import { WorkspaceService } from './workspace.service';
import { ExecutionService } from './execution.service';
import { PlguinUpdate } from '@awdware/gah-shared';


@injectable()
export class PluginService implements IPluginService {
  private _plugins = new Array<GahPlugin>();
  private _handlers = new Array<GahEventHandler>();

  @inject(FileSystemService)
  private _fileSystemService: IFileSystemService;
  @inject(LoggerService)
  private _loggerService: ILoggerService;
  @inject(ConfigService)
  private _configService: IConfigurationService;
  @inject(TemplateService)
  private _templateService: ITemplateService;
  @inject(PromptService)
  private _promptService: IPromptService;
  @inject(WorkspaceService)
  private _workspaceService: IWorkspaceService;
  @inject(ExecutionService)
  private _executionService: IExecutionService;


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

  public registerPlugin(plugin: GahPlugin, pluginDepCfg: GahPluginDependencyConfig) {
    plugin['config'] = pluginDepCfg.settings;
    this.initPluginServices(plugin);
    plugin['onInit']();
    this._plugins.push(plugin);
  }

  public triggerEvent(event: GahEvent, payload: GahEventPayload) {
    this._handlers.forEach(handler => {
      if (handler.event === event)
        try {
          handler.handler(payload);
        } catch (error) {
          this._loggerService.error('Error in plugin ' + handler.pluginName + '.\nCallstack from plugin:');
          throw error;
        }
    });
  }

  public registerEventHandler(pluginName: string, event: GahEvent, handler: (payload: GahEventPayload) => void) {
    const newHandler = new GahEventHandler();
    newHandler.pluginName = pluginName;
    newHandler.event = event;
    newHandler.handler = handler;
    this._handlers.push(newHandler);
  }

  public async installPlugin(pluginName: string): Promise<boolean> {
    const packageJson = this._fileSystemService.parseFile<PackageJson>('package.json');

    const alreadyInstalled = (packageJson.dependencies?.[pluginName] || packageJson.devDependencies?.[pluginName]) && true;

    this._loggerService.startLoadingAnimation('Downloading Plugin');
    const success = await this._executionService.execute('yarn add ' + pluginName + ' -D -E', false);
    if (!success) {
      this._loggerService.stopLoadingAnimation(false, false, 'Downloading Plugin failed');
      return false;
    }
    this._loggerService.stopLoadingAnimation(false, true, 'Downloading Plugin succeeded');
    this._loggerService.startLoadingAnimation('Checking Plugin');
    const pluginPath = this._fileSystemService.join(process.cwd(), 'node_modules', pluginName);
    const pluginDefinition = await import(pluginPath);
    let plugin: GahPlugin;
    try {
      plugin = new pluginDefinition.default() as GahPlugin;
    } catch (error) {
      this._loggerService.stopLoadingAnimation(false, false, 'This package is not a valid GahPlugin!');
      if (!alreadyInstalled) {
        await this.removePackage(pluginName);
      }
      return false;
    }
    if (!plugin['onInit'] || !plugin['registerEventListener'] || !plugin['onInstall']) {
      this._loggerService.stopLoadingAnimation(false, false, 'This package is not a valid GahPlugin!');
      if (!alreadyInstalled) {
        await this.removePackage(pluginName);
      }
      return false;
    }
    this.initPluginServices(plugin);
    this._loggerService.stopLoadingAnimation(false, true, 'Plugin checked');
    const cfg = this._configService.getGahConfig();
    let pluginCfg: GahPluginDependencyConfig;
    if (!cfg.plugins) {
      cfg.plugins = new Array<GahPluginDependencyConfig>();
    }
    if (cfg.plugins.some(x => x.name === pluginName)) {
      pluginCfg = cfg.plugins.find(x => x.name === pluginName)!;
    } else {
      pluginCfg = new GahPluginDependencyConfig();
    }
    pluginCfg.name = pluginName!;
    this._loggerService.log(`Starting settings configuration for '${pluginName}'`);
    pluginCfg.settings = await plugin['onInstall'](pluginCfg.settings);
    this._loggerService.log('Plugin settings configuration finished');

    if (!cfg.plugins.some(x => x.name === pluginName)) {
      cfg.plugins.push(pluginCfg);
    }
    this._configService.saveGahConfig();
    return true;
  }

  private async removePackage(pluginName: string) {
    this._loggerService.startLoadingAnimation('Cleaning up downloaded files.');
    const success = await this._executionService.execute('yarn remove ' + pluginName, false);
    if (success) {
      this._loggerService.stopLoadingAnimation(false, true, 'Cleaned up downloaded files.');
    } else {
      this._loggerService.stopLoadingAnimation(false, false, 'Uninstalling plugin failed!');
      this._loggerService.error(this._executionService.executionErrorResult);
    }
  }

  public async removePlugin(pluginName: string): Promise<boolean> {
    this._loggerService.startLoadingAnimation('Uninstalling plugin: ' + pluginName);
    const success = await this._executionService.execute('yarn remove ' + pluginName, false);
    if (success) {
      this._loggerService.stopLoadingAnimation(false, true, `Plugin '${pluginName}' has been uninstalled.`);
      return true;
    } else {
      this._loggerService.stopLoadingAnimation(false, false, `Uninstalling plugin '${pluginName}' failed!`);
      this._loggerService.error(this._executionService.executionErrorResult);
      return false;
    }
  }

  public async getUpdateablePlugins(pluginName?: string): Promise<PlguinUpdate[] | null> {
    const cfg = this._configService.getGahConfig();
    if (!cfg.plugins) {
      this._loggerService.log('No plugins installed!');
      return null;
    }

    const searchForPkugins = pluginName ?? cfg.plugins.map(x => x.name).join(' ');

    this._loggerService.startLoadingAnimation('Searching for plugin updates');
    await this._executionService.execute('yarn outdated ' + searchForPkugins, false);
    const yarnOutput = this._executionService.executionResult;
    const updates = new Array<PlguinUpdate>();
    yarnOutput.split('\n').forEach(yarnOutputLine => {
      const updateMatches = yarnOutputLine.match(/^(\S+)\s(\d+.\d+.\d+)\s+(\d+.\d+.\d+)\s+(\d+.\d+.\d+)\s+/);
      if (!updateMatches)
        return;
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

  public async updatePlugins(pluginNames: string[]) {
    this._loggerService.startLoadingAnimation('Updating plugins');
    const success = await this._executionService.execute('yarn add ' + pluginNames.join(' ') + ' -D -E', false);
    if (success) {
      this._loggerService.stopLoadingAnimation(false, true, 'Updated plugins');
    } else {
      this._loggerService.stopLoadingAnimation(false, false, 'Updating plugin(s) failed');
    }
  }
}

import { injectable } from 'inversify';

import { GahPluginDependencyConfig, PlguinUpdate } from '@awdware/gah-shared';
import { Controller } from './controller';

@injectable()
export class PluginController extends Controller {
  public async add(pluginName?: string) {

    const pluginName_ = await this._promptService
      .input({
        msg: 'Please enter the name of the plugin you want to add',
        enabled: () => !pluginName
      });

    pluginName = pluginName ?? pluginName_;
    if (!pluginName) {
      this._loggerService.warn('No plugin name provided...');
      return;
    }

    const cfg = this._configService.getGahConfig();
    cfg.plugins ??= new Array<GahPluginDependencyConfig>();

    if (cfg.plugins.some(x => x.name.toLowerCase() === pluginName?.toLowerCase())) {
      this._loggerService.warn('This plugin has already been added.');
      return;
    }

    await this._pluginService.installPlugin(pluginName.toLowerCase());

  }

  public async remove(pluginName?: string) {

    const pluginName_ = await this.askForInstalledPlugin('Please select the plugin you want to remove', pluginName);
    if (!pluginName_) { return; }
    pluginName = pluginName || pluginName_;

    await this._pluginService.removePlugin(pluginName);
  }

  public async update(pluginName?: string) {
    const updateablePlugins = await this._pluginService.getUpdateablePlugins(pluginName);
    if (!updateablePlugins || updateablePlugins.length === 0) {
      this._loggerService.log('No plugins can be updated.');
      return;
    }

    let pluginsToUpdate: PlguinUpdate[];
    if (!pluginName) {
      const resp = await this._promptService.checkbox({
        msg: 'Please select the plugins you want to update',
        enabled: () => true,
        choices: () => updateablePlugins.map(x => `${x.name} ${x.fromVersion} > ${x.toVersion}`)
      });
      pluginsToUpdate = resp.map(x => x.split(' ')[0]).map(name => updateablePlugins.find(x => x.name === name)!);
      if (pluginsToUpdate.length === 0) {
        this._loggerService.log('No plugins selected.');
        return;
      }
    } else {
      const pluginInstalled = this._pluginService.isPluginConfigured(pluginName);
      if (!pluginInstalled) {
        this._loggerService.log(`The plugin '${pluginName}' is not installed`);
        return;
      }

      pluginsToUpdate = [updateablePlugins.find(x => x.name === pluginName)!];
      if (pluginsToUpdate.length === 0) {
        this._loggerService.log(`No updates available for the plugin '${pluginName}'`);
        return;
      }
    }

    await this._pluginService.updatePlugins(pluginsToUpdate);
  }

  public async run(command: string[]) {
    const cmd = command.splice(0, 1)[0];
    const args = command;
    this._pluginService.run(cmd, args);
  }

  private async askForInstalledPlugin(msg: string, pluginName?: string): Promise<string | null> {
    const cfg = this._configService.getGahConfig();
    if (!cfg.plugins) {
      this._loggerService.log('No plugins installed!');
      return null;
    }

    const pluginName_ = await this._promptService
      .list({
        msg: msg,
        enabled: () => !pluginName,
        choices: () => cfg.plugins!.map(x => x.name)
      });

    return pluginName ?? pluginName_;
  }


}

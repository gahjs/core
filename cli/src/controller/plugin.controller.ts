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
    if (!cfg.plugins) { cfg.plugins = new Array<GahPluginDependencyConfig>(); }

    if (cfg.plugins.some(x => x.name.toLowerCase() === pluginName?.toLowerCase())) {
      this._loggerService.warn('This plugin has already been added.');
      return;
    }

    await this._pluginService.installPlugin(pluginName.toLowerCase());

  }

  public async remove(pluginName?: string) {

    const pluginName_ = await this.askForInstalledPlugin('Please select the plugin you want to remove', pluginName);
    if (!pluginName_) { return; }

    const success = await this._pluginService.removePlugin(pluginName_);
    if (success) {
      const cfg = this._configService.getGahConfig();
      const idx = cfg.plugins?.findIndex(x => x.name === pluginName) ?? -1;
      if (idx === -1) { throw new Error('Error uninstalling plugin ' + pluginName); }

      cfg.plugins?.splice(idx, 1);
      this._configService.saveGahConfig();
    } else {
      throw new Error('Error uninstalling plugin ' + pluginName);
    }
  }

  public async update(pluginName: string) {
    const updateablePlugins = await this._pluginService.getUpdateablePlugins(pluginName);
    if (!updateablePlugins || updateablePlugins.length === 0) { return; }
    let pluginsToUpdate: PlguinUpdate[];
    if (!pluginName) {
      const resp = await this._promptService.checkbox({
        msg: 'Please select the plugins you want to update',
        enabled: () => true,
        choices: () => updateablePlugins.map(x => x.name + ' ' + x.fromVersion + ' > ' + x.toVersion)
      });
      pluginsToUpdate = resp.map(x => x.split(' ')[0]).map(name => updateablePlugins.find(x => x.name === name)!);
    } else {
      pluginsToUpdate = [updateablePlugins.find(x => x.name === pluginName)!];
    }

    await this._pluginService.updatePlugins(pluginsToUpdate);
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

    pluginName = pluginName ?? pluginName_;
    if (!pluginName) {
      return null;
    }
    return pluginName;
  }


}

import { GahEvent, GahEventPayload } from '../models/gah-event';
import { PlguinUpdate } from '../models/plugin-update';

export interface IPluginService {
  loadInstalledPlugins(): Promise<void>;
  triggerEvent(event: GahEvent, payload: GahEventPayload): void;
  registerEventHandler(pluginName: string, event: GahEvent, handler: (payload: GahEventPayload) => void): void;
  installPlugin(pluginName: string): Promise<boolean>;
  removePlugin(pluginName: string): Promise<boolean>;
  getUpdateablePlugins(pluginName?: string): Promise<PlguinUpdate[] | null>;
  updatePlugins(pluginUpdates: PlguinUpdate[]): Promise<void>;
  pluginNames: { name: string, version: string }[];
}

import { GahEvent, GahEventType, ExtractEventPayload } from '../models/gah-event';
import { PlguinUpdate } from '../models/plugin-update';

export interface IPluginService {
  loadInstalledPlugins(): Promise<void>;
  triggerEvent<T extends GahEventType>(type: T, payload: Omit<ExtractEventPayload<GahEvent, T>, 'type'>): void;
  registerEventHandler<T extends GahEventType>(pluginName: string, type: T, handler: (payload: Omit<ExtractEventPayload<GahEvent, T>, 'type'>) => void): void;
  installPlugin(pluginName: string): Promise<boolean>;
  removePlugin(pluginName: string): Promise<boolean>;
  getUpdateablePlugins(pluginName?: string): Promise<PlguinUpdate[] | null>;
  updatePlugins(pluginUpdates: PlguinUpdate[]): Promise<void>;
  isPluginConfigured(pluginName: string): boolean;
}

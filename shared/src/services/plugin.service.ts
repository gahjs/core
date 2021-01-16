import { GahEvent, GahEventType, ExtractEventPayload } from '../models/gah-event';
import { PlguinUpdate } from '../models/plugin-update';

export interface IPluginService {
  init(): Promise<void>;
  loadInstalledPlugins(): Promise<void>;
  triggerEvent<T extends GahEventType>(type: T, payload: ExtractEventPayload<GahEvent, T>): Promise<void>;
  registerEventHandler<T extends GahEventType>(pluginName: string, type: T, handler: (payload: ExtractEventPayload<GahEvent, T>) => Promise<void> | void): void;
  installPlugin(pluginName: string): Promise<boolean>;
  removePlugin(pluginName: string): Promise<boolean>;
  getUpdateablePlugins(pluginName?: string): Promise<PlguinUpdate[] | null>;
  updatePlugins(pluginUpdates: PlguinUpdate[]): Promise<void>;
  isPluginConfigured(pluginName: string): Promise<boolean>;
  registerCommandHandler(pluginName: string, commandName: string, handler: (args: string[]) => Promise<boolean> | boolean): void;
  run(cmd: string, args: string[]): Promise<boolean>;
  storeData<T>(pluginName: string, key: string, data: T): void;
  readData<T>(pluginName: string, key: string): T;
}

import { IFileSystemService } from '../services/file-system.service';
import { ILoggerService } from '../services/logger.service';
import { IConfigurationService } from '../services/configuration.service';
import { ITemplateService } from '../services/template.service';
import { IPromptService } from '../services/prompt.service';
import { IWorkspaceService } from '../services/workspace.service';
import { IPluginService } from '../services/plugin.service';
import { GahEventPayload } from './gah-event-payload.model';
import { GahEvent } from './gah-event';
import { GahPluginConfig } from './gah-plugin-config';
import { IExecutionService } from '../services/execution.service';

export abstract class GahPlugin {
  protected readonly name: string;
  protected config: GahPluginConfig;

  protected fileSystemService: IFileSystemService;
  protected loggerService: ILoggerService;
  protected configurationService: IConfigurationService;
  protected templateService: ITemplateService;
  protected promptService: IPromptService;
  protected workspaceService: IWorkspaceService;
  protected executionService: IExecutionService;
  // This property gets set from the outside and should better not be used within a plugin itself, therfor its private.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private pluginService: IPluginService;

  constructor(pluginName: string) {
    this.name = pluginName;
  }

  protected abstract onInit(): void;
  protected abstract onInstall(existingSettings?: GahPluginConfig): Promise<GahPluginConfig>;

  protected registerEventListener(event: GahEvent, handler: (event: GahEventPayload) => void): void {
    this.pluginService.registerEventHandler(this.name, event, handler);
  }
}

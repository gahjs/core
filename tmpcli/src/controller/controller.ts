import DIContainer from '../di-container';
import { ConfigService } from '../services/config.service';
import { ExecutionService } from '../services/execution.service';
import { FileSystemService } from '../services/file-system.service';
import { LoggerService } from '../services/logger.service';
import { PluginService } from '../services/plugin.service';
import { PromptService } from '../services/prompt.service';
import { TemplateService } from '../services/template.service';
import { WorkspaceService } from '../services/workspace.service';
import { injectable } from 'inversify';
import { IWorkspaceService, ITemplateService, IPromptService, IPluginService, ILoggerService, IFileSystemService, IExecutionService, IConfigurationService } from '@awdware/gah-shared';

@injectable()
export abstract class Controller {
  protected _configService: IConfigurationService;
  protected _executionService: IExecutionService;
  protected _fileSystemService: IFileSystemService;
  protected _loggerService: ILoggerService;
  protected _pluginService: IPluginService;
  protected _promptService: IPromptService;
  protected _templateService: ITemplateService;
  protected _workspaceService: IWorkspaceService;

  constructor() {
    this._configService = DIContainer.get(ConfigService);
    this._executionService = DIContainer.get(ExecutionService);
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
    this._pluginService = DIContainer.get(PluginService);
    this._promptService = DIContainer.get(PromptService);
    this._templateService = DIContainer.get(TemplateService);
    this._workspaceService = DIContainer.get(WorkspaceService);
  }
}

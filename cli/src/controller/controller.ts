import { DIContainer } from '../di-container';
import { ConfigService } from '../services/config.service';
import { ExecutionService } from '../services/execution.service';
import { FileSystemService } from '../services/file-system.service';
import { LoggerService } from '../services/logger.service';
import { PluginService } from '../services/plugin.service';
import { PromptService } from '../services/prompt.service';
import { TemplateService } from '../services/template.service';
import { WorkspaceService } from '../services/workspace.service';
import { ContextService } from '../services/context-service';
import {
  IWorkspaceService, ITemplateService, IPromptService, IPluginService, ILoggerService,
  IFileSystemService, IExecutionService, IConfigurationService, IContextService, IPackageService, ICleanupService
} from '@gah/shared';
import { PackageService } from '../services/package.service';
import { CleanupSevice } from '../services/cleanup.service';

export abstract class Controller {
  protected _cleanupService: ICleanupService;
  protected _configService: IConfigurationService;
  protected _executionService: IExecutionService;
  protected _fileSystemService: IFileSystemService;
  protected _loggerService: ILoggerService;
  protected _packageService: IPackageService;
  protected _pluginService: IPluginService;
  protected _promptService: IPromptService;
  protected _templateService: ITemplateService;
  protected _workspaceService: IWorkspaceService;
  protected _contextService: IContextService;

  constructor() {
    this._cleanupService = DIContainer.resolve<CleanupSevice>('cleanupSevice');
    this._configService = DIContainer.resolve<ConfigService>('configService');
    this._executionService = DIContainer.resolve<ExecutionService>('executionService');
    this._fileSystemService = DIContainer.resolve<FileSystemService>('fileSystemService');
    this._loggerService = DIContainer.resolve<LoggerService>('loggerService');
    this._packageService = DIContainer.resolve<PackageService>('packageService');
    this._pluginService = DIContainer.resolve<PluginService>('pluginService');
    this._promptService = DIContainer.resolve<PromptService>('promptService');
    this._templateService = DIContainer.resolve<TemplateService>('templateService');
    this._workspaceService = DIContainer.resolve<WorkspaceService>('workspaceService');
    this._contextService = DIContainer.resolve<ContextService>('contextService');
  }
}

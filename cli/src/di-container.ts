import { Container } from 'inversify';

import { InitController } from './controller/init.controller';
import { MainController } from './controller/main.controller';
import { DependencyController } from './controller/dependency.controller';
import { HostModuleController } from './controller/host-module.controller';
import { InstallController } from './controller/install.controller';

import { FileSystemService } from './services/file-system.service';
import { LoggerService } from './services/logger.service';
import { ConfigService } from './services/config.service';
import { TemplateService } from './services/template.service';
import { PromptService } from './services/prompt.service';
import { WorkspaceService } from './services/workspace.service';
import { PluginService } from './services/plugin.service';
import { PluginController } from './controller/plugin.controller';
import { ExecutionService } from './services/execution.service';
import { ContextService } from './services/context-service';


const DIContainer = new Container();
DIContainer.bind<MainController>(MainController).toSelf().inSingletonScope();
DIContainer.bind<InitController>(InitController).toSelf().inSingletonScope();
DIContainer.bind<DependencyController>(DependencyController).toSelf().inSingletonScope();
DIContainer.bind<HostModuleController>(HostModuleController).toSelf().inSingletonScope();
DIContainer.bind<InstallController>(InstallController).toSelf().inSingletonScope();
DIContainer.bind<PluginController>(PluginController).toSelf().inSingletonScope();

DIContainer.bind<FileSystemService>(FileSystemService).toSelf().inSingletonScope();
DIContainer.bind<LoggerService>(LoggerService).toSelf().inSingletonScope();
DIContainer.bind<ContextService>(ContextService).toSelf().inSingletonScope();
DIContainer.bind<ConfigService>(ConfigService).toSelf().inSingletonScope();
DIContainer.bind<TemplateService>(TemplateService).toSelf().inSingletonScope();
DIContainer.bind<PromptService>(PromptService).toSelf().inSingletonScope();
DIContainer.bind<WorkspaceService>(WorkspaceService).toSelf().inSingletonScope();
DIContainer.bind<PluginService>(PluginService).toSelf().inSingletonScope();
DIContainer.bind<ExecutionService>(ExecutionService).toSelf().inSingletonScope();


export default DIContainer;

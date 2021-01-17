import { Container } from 'inversify';

import { DependencyController } from './controller/dependency.controller';
import { HostModuleController } from './controller/hostModule.controller';
import { InitController } from './controller/init.controller';
import { InstallController } from './controller/install.controller';
import { MainController } from './controller/main.controller';
import { PluginController } from './controller/plugin.controller';
import { RunController } from './controller/run.controller';
import { TidyController } from './controller/tidy.controler';
import { WhyController } from './controller/why.controller';

import { CleanupSevice } from './services/cleanup.service';
import { ConfigService } from './services/config.service';
import { ContextService } from './services/context-service';
import { ExecutionService } from './services/execution.service';
import { FileSystemService } from './services/file-system.service';
import { GitService } from './services/git.service';
import { LoggerService } from './services/logger.service';
import { PackageService } from './services/package.service';
import { PluginService } from './services/plugin.service';
import { PromptService } from './services/prompt.service';
import { TemplateService } from './services/template.service';
import { WorkspaceService } from './services/workspace.service';


export const DIContainer = new Container();
DIContainer.bind<DependencyController>(DependencyController).toSelf().inSingletonScope();
DIContainer.bind<HostModuleController>(HostModuleController).toSelf().inSingletonScope();
DIContainer.bind<InitController>(InitController).toSelf().inSingletonScope();
DIContainer.bind<InstallController>(InstallController).toSelf().inSingletonScope();
DIContainer.bind<MainController>(MainController).toSelf().inSingletonScope();
DIContainer.bind<PluginController>(PluginController).toSelf().inSingletonScope();
DIContainer.bind<RunController>(RunController).toSelf().inSingletonScope();
DIContainer.bind<TidyController>(TidyController).toSelf().inSingletonScope();
DIContainer.bind<WhyController>(WhyController).toSelf().inSingletonScope();

DIContainer.bind<CleanupSevice>(CleanupSevice).toSelf().inSingletonScope();
DIContainer.bind<ConfigService>(ConfigService).toSelf().inSingletonScope();
DIContainer.bind<ContextService>(ContextService).toSelf().inSingletonScope();
DIContainer.bind<ExecutionService>(ExecutionService).toSelf().inSingletonScope();
DIContainer.bind<FileSystemService>(FileSystemService).toSelf().inSingletonScope();
DIContainer.bind<GitService>(GitService).toSelf().inSingletonScope();
DIContainer.bind<LoggerService>(LoggerService).toSelf().inSingletonScope();
DIContainer.bind<PackageService>(PackageService).toSelf().inSingletonScope();
DIContainer.bind<PluginService>(PluginService).toSelf().inSingletonScope();
DIContainer.bind<PromptService>(PromptService).toSelf().inSingletonScope();
DIContainer.bind<TemplateService>(TemplateService).toSelf().inSingletonScope();
DIContainer.bind<WorkspaceService>(WorkspaceService).toSelf().inSingletonScope();


export default DIContainer;

import { asClass, createContainer, InjectionMode, Lifetime } from 'awilix';

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


export const DIContainer = createContainer({ injectionMode: InjectionMode.CLASSIC });

DIContainer.register(
  {
    dependencyController: asClass(DependencyController, { lifetime: Lifetime.SINGLETON }),
    hostModuleController: asClass(HostModuleController, { lifetime: Lifetime.SINGLETON }),
    initController: asClass(InitController, { lifetime: Lifetime.SINGLETON }),
    installController: asClass(InstallController, { lifetime: Lifetime.SINGLETON }),
    mainController: asClass(MainController, { lifetime: Lifetime.SINGLETON }),
    pluginController: asClass(PluginController, { lifetime: Lifetime.SINGLETON }),
    runController: asClass(RunController, { lifetime: Lifetime.SINGLETON }),
    tidyController: asClass(TidyController, { lifetime: Lifetime.SINGLETON }),
    whyController: asClass(WhyController, { lifetime: Lifetime.SINGLETON }),
    cleanupSevice: asClass(CleanupSevice, { lifetime: Lifetime.SINGLETON }),
    configService: asClass(ConfigService, { lifetime: Lifetime.SINGLETON }),
    contextService: asClass(ContextService, { lifetime: Lifetime.SINGLETON }),
    executionService: asClass(ExecutionService, { lifetime: Lifetime.SINGLETON }),
    fileSystemService: asClass(FileSystemService, { lifetime: Lifetime.SINGLETON }),
    gitService: asClass(GitService, { lifetime: Lifetime.SINGLETON }),
    loggerService: asClass(LoggerService, { lifetime: Lifetime.SINGLETON }),
    packageService: asClass(PackageService, { lifetime: Lifetime.SINGLETON }),
    pluginService: asClass(PluginService, { lifetime: Lifetime.SINGLETON }),
    promptService: asClass(PromptService, { lifetime: Lifetime.SINGLETON }),
    templateService: asClass(TemplateService, { lifetime: Lifetime.SINGLETON }),
    workspaceService: asClass(WorkspaceService, { lifetime: Lifetime.SINGLETON })
  }
);

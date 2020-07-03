import { ModulesTemplateData } from '../modules-template-data';

export interface GahFolderData {
  readonly moduleBaseFolder: string;
  readonly pathRelativeToModuleBaseFolder: string;
  readonly modulesTemplateData: ModulesTemplateData;

  readonly dependencyPath: string;
  readonly stylesPath: string;
  readonly generatedPath: string;
}

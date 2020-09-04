export class ModulesTemplateData {
  modules: ModuleTemplateData[];

  constructor() {
    this.modules = new Array<ModuleTemplateData>();
  }
}

export class ModuleTemplateData {
  name: string;
  packageName: string;
  saveName: string;
  isEntry: boolean;
  publicApiImportPath: string;
  baseModuleName?: string;
  isLibraryOnly: boolean;
  parentGahModule: string | null;
  staticModuleInit?: string;
}

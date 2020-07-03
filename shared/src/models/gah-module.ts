import { ModuleDefinition } from './module-definition';

export class GahModule {
  protected $schema: string = 'https://raw.githubusercontent.com/awdware/gah/master/shared/assets/gah-module-schema.json';
  /**
   * The array of the modules defined in this project.
   */
  public modules: ModuleDefinition[];

  public get isHost() { return false; }

  constructor() {
    this.modules = new Array<ModuleDefinition>();
  }
}

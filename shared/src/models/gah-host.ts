import { ModuleReference } from './module-reference';

export class GahHost {
  protected $schema: string = 'https://raw.githubusercontent.com/awdware/gah/master/shared/assets/gah-host-schema.json';
  /**
   * The array of the modules that should be loaded for this host.
   */
  public modules: ModuleReference[];

  /**
   * Use aot compilation for the host? (Enabled by default)
   */
  public aot: boolean = true;

  public get isHost() { return true; }

  constructor() {
    this.modules = new Array<ModuleReference>();
  }
}

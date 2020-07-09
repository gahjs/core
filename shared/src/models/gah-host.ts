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
  public aot?: boolean = true;

  /**
   * Additional lines in the head section of the index.html file (eg. <link rel="icon" href="assets/[module-name]/favicon.ico" type="image/x-icon"/> )
   */
  public htmlHeadContent?: string | string[];

  /**
   * The <title> tag of the website
   */
  public title?: string;

  public get isHost() { return true; }

  constructor() {
    this.modules = new Array<ModuleReference>();
  }
}

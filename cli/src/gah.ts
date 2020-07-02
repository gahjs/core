import DIContainer from './di-container';

import { ContextService } from './services/context-service';
import { InstallController } from './controller/install.controller';

declare var calledFromCode: boolean;

() => {
  DIContainer.get(ContextService).setContext({ calledFromCli: false });
};

export const gah = {
  /**
   * Installs the module(s) or host in the current directory. Use this in your build pipeline before building for example with the angular cli.
   */
  install: () => DIContainer.get(InstallController).install()
};

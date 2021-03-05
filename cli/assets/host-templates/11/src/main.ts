import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from './environments/environment';
import { GahEnvironment } from '@gah/shared';
import { init } from './init.app';

if (environment.production) {
  enableProdMode();
}

fetch('environment.json', { cache: 'no-store' })
  .then(res => res.json())
  .then(async (env: GahEnvironment) => {
    if (!environment.production) {
      console.log(env);
    }

    (window as any).__gah__env = env;

    init(env);

    platformBrowserDynamic()
      .bootstrapModule((await import('./app/gah-main.module')).GahMainModule)
      .catch(err => console.error(err));
  })
  .catch(err => {
    console.error('environment.json not found or not readable\nTrace:');
    console.error(err);
  });

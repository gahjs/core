import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { GahEnvironments, GahEnvironment } from '@awdware/gah-shared';


const environments = require('../../environments.json') as GahEnvironments;
if (!environment.production) {
  console.log(environments);
}
const win = window as any as Window & { __env: GahEnvironment };
win.__env = environments.default;

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

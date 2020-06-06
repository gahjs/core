import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { GahEnvironment } from '@awdware/gah-shared';


const env = require('../environment.json') as GahEnvironment;
if (!environment.production) {
  console.log(env);
}
const win = window as any as Window & { __env: GahEnvironment };
win.__env = env;

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

import { modulePackages } from './app/.gah/generated/gah-modules';
import { Routes } from '@angular/router';

export const init = (env: any) => {
  for (const m of modulePackages) {
    setEnvironmentValues((m.module as any).environment, env);
  }
  initRoutes();
}

const setEnvironmentValues = (moduleEnv: any, env: any) => {
  if (moduleEnv) {
    Object.keys(moduleEnv).forEach(k => {
      if (env[k] === undefined) {
        console.error(`Missing value in host environment: ${k}`);
      }
      moduleEnv[k] = env[k];
    });
  }
}

let _routes: Routes = [];
let facadeRoutes: Routes = [];

const initRoutes = () => {
  modulePackages.forEach(m => {
    const mod = m.module;
    const isEntry = m.isEntry;
    readModuleRoutes(mod, isEntry);
  });

  facadeRoutes[0].children.push(..._routes);

  (window as any).__gah__routes = facadeRoutes;
}

const readModuleRoutes = (mod: any, isEntry: boolean) => {
  if (mod.routes) {
    const routes = mod.routes;
    if (isEntry) {
      facadeRoutes = routes;
    } else {
      _routes.push(...routes);
    }
  }
}

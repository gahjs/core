import { modulePackages } from './app/.gah/generated/gah-modules';
import { Routes, Route } from '@angular/router';

export const init = (env: any) => {
  for (const m of modulePackages) {
    setEnvironmentValues((m.module as any).environment, env);
  }
  initRoutes();
};

const gahOutletName = 'gah-outlet';

const setEnvironmentValues = (moduleEnv: any, env: any) => {
  if (moduleEnv) {
    Object.keys(moduleEnv).forEach(k => {
      if (env[k] === undefined) {
        console.error(`Missing value in host environment: ${k}`);
      }
      moduleEnv[k] = env[k];
    });
  }
};

interface GahRouteConfig {
  routes: Routes;
  isEntry: boolean;
  parentGahModule: string | null;
  name: string;
}

let globalRouteCfg: GahRouteConfig[];

const initRoutes = () => {
  globalRouteCfg = new Array<GahRouteConfig>();

  modulePackages.forEach(m => {
    const mod = m.module as any;
    if (mod.routes) {
      const isEntry = m.isEntry;
      const parentGahModule = m.parentGahModule;
      const routes = mod.routes;
      const name = m.moduleName;
      globalRouteCfg.push({
        isEntry,
        routes,
        parentGahModule,
        name
      });
    }
  });
  const entry = buildModuleRoutes(globalRouteCfg);

  (window as any).__gah__routes = entry;
};

const buildModuleRoutes = (routeCfg: GahRouteConfig[]) => {
  const entryArr = routeCfg.filter(x => x.isEntry);
  if (entryArr.length > 1) {
    throw new Error('More than one entry module defined!');
  } else if (entryArr.length === 0) {
    throw new Error('No entry module defined!');
  }

  const entry = entryArr[0];

  for (const r of routeCfg) {
    if (r.isEntry) {
      continue;
    }
    let success = false;
    if (!r.parentGahModule) {
      success = addToGahOutlet(entry.routes, r);
      if (!success) {
        addToChildren(entry.routes[0], r.routes);
        success = true;
      }
    } else {
      const parentModule = routeCfg.find(x => x.name === r.parentGahModule);
      success = addToGahOutlet(parentModule.routes, r);
    }
    if (!success) {
      throw new Error('Could not build routes');
    }
  }

  fixGahOutlets(entry.routes);

  return entry.routes;
};

const addedRoutes = [];

const addToGahOutlet = (parentRoutes: Routes, child: GahRouteConfig) => {
  if (!parentRoutes) {
    return false;
  }
  const gahOutlet = parentRoutes.find(x => x.path === gahOutletName);
  if (gahOutlet) {
    addToChildren(gahOutlet, child.routes);
    return true;
  } else {
    for (const parentRoute of parentRoutes) {
      if (addToGahOutlet(parentRoute.children?.filter(x => !addedRoutes.includes(x)), child)) {
        return true;
      }
    }
    return false;
  }
};



const addToChildren = (route: Route, routes: Routes) => {
  if (!route.children) {
    route.children = [];
  }
  addedRoutes.push(...routes);
  route.children.push(...routes);
};

const fixGahOutlets = (routes: Routes) => {
  routes.forEach(x => {
    if (x.children) {
      fixGahOutlets(x.children);

      for (const a of x.children) {
        if (a.path === gahOutletName) {
          x.children = [...x.children.filter(c => c.path !== gahOutletName), ...a.children];
        }
      }
    }
  });
};

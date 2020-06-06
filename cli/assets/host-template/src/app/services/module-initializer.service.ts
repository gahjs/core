import { Injectable } from '@angular/core';
import { Resolve, Router, Routes } from '@angular/router';
import { Observable } from 'rxjs';

import { modulePackages } from '../.gah/generated/gah-modules';
import { GahEnvironment } from '@awdware/gah-shared';


@Injectable({ providedIn: 'root' })
export class ModuleInitializerService implements Resolve<null> {
  private _router: Router;
  private _modules = new Array<any>();
  private _facadeRoutes: Routes = [];
  private _routes: Routes = [];
  private _env: GahEnvironment;

  constructor(
    router: Router,
  ) {
    this._router = router;
    const win: Window & { __env: GahEnvironment } = window as any;
    this._env = win.__env;
    win.__env = undefined; // This is not needed currently, maybe there are usecases?
  }

  private setEnvironmentValues(env: any) {
    if (env) {
      Object.keys(env).forEach(k => {
        if (this._env[k] === undefined) {
          console.error('Missing value in host environment: ' + k);
        }
        env[k] = this._env[k];
      });
    }
  }

  resolve(): Observable<null> {
    return new Observable<null>(obs => {
      this.loadModules().subscribe(() => {
        this._modules.forEach(m => {
          const mod = m.module;
          const isEntry = m.isEntry;

          this.setEnvironmentValues(mod.environment);
          this.readModuleRoutes(mod, isEntry);
        });

        this._facadeRoutes[0].children.push(...this._routes);

        this._router.resetConfig(this._facadeRoutes);

        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        urlParams.forEach((v, k) => {
          params[k] = v;
        });
        this._router.navigate(window.location.pathname.split('/'), { queryParams: params });

        obs.next(null);
      });
    });
  }

  private readModuleRoutes(mod: any, isEntry: boolean) {
    if (mod.routes) {
      const routes = mod.routes;
      if (isEntry) {
        this._facadeRoutes = routes;
      } else {
        this._routes.push(...routes);
      }
    }
  }

  private loadModules() {
    return new Observable<void>(obs => {
      modulePackages.forEach((moduleImport) => {
        this._modules.push(moduleImport);
        if (this._modules.length === modulePackages.length) {
          obs.next(null);
        }
      });
    });
  }
}

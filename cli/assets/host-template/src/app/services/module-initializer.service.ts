import { Injectable } from '@angular/core';
import { Location } from "@angular/common";
import { Resolve, Router, Routes } from '@angular/router';
import { Observable } from 'rxjs';

import { modulePackages } from '../.gah/generated/gah-modules';
import { GahEnvironment } from '@awdware/gah-shared';


@Injectable({ providedIn: 'root' })
export class ModuleInitializerService implements Resolve<null> {
  private readonly _router: Router;
  private readonly _location: Location;
  private readonly _modules = new Array<any>();
  private readonly _routes: Routes = [];
  private readonly _env: GahEnvironment;
  private _facadeRoutes: Routes = [];

  constructor(
    router: Router,
    location: Location
  ) {
    this._router = router;
    this._location = location;
    const win: Window & { __env: GahEnvironment } = window as any;
    this._env = win.__env;
    win.__env = undefined; // This is not needed currently, maybe there are usecases?
  }

  private setEnvironmentValues(env: any) {
    if (env) {
      Object.keys(env).forEach(k => {
        if (this._env[k] === undefined) {
          console.error(`Missing value in host environment: ${k}`);
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

        const baseHref = document.getElementsByTagName('head')[0].getElementsByTagName('base')[0].getAttribute('href');
        let location = window.location.pathname;
        if (baseHref && baseHref.length > 1) {
          location = location.replace(baseHref, '');
        }

        this._router.navigate(location.split('/'), { queryParams: params });
        this._router.config

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

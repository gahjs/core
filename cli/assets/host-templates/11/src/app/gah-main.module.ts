import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { GahMainComponent } from './gah-main.component';
import { RouterModule, Router } from '@angular/router';
import { gahModules } from './.gah/generated/gah-modules';

@NgModule({
  declarations: [GahMainComponent],
  imports: [BrowserModule, HttpClientModule, RouterModule.forRoot([]), gahModules],
  exports: [HttpClientModule],
  bootstrap: [GahMainComponent]
})
export class GahMainModule {
  constructor(router: Router) {
    if (!(window as any).__gah__routes) {
      throw new Error('Routes could not be built');
    }

    router.resetConfig((window as any).__gah__routes);
    (window as any).__gah__routes = undefined;
  }
}

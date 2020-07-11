import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { RouterModule, Router } from '@angular/router';
import { gahModules } from './.gah/generated/gah-modules';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([]),
    gahModules
  ],
  exports: [HttpClientModule],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(router: Router) {
    console.log('constructor: AppModule')

    if (!(window as any).__gah__routes) {
      throw new Error('Routes could not be builded');
    }

    router.resetConfig((window as any).__gah__routes);
    (window as any).__gah__routes = undefined;
  }
}

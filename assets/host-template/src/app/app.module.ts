/*
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  *   Please Only edit this file in the marked areas. Changes outside there areas might be overwriten by gah.   *
  *    If you really need to edit a section that is not marked for editing, please open an issue on github:     *
  *                               https://github.com/awdware/gah/issues/new                                 *
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*/

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { RouterModule, Router } from '@angular/router';
import { ModuleInitializerService } from './services/module-initializer.service';
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
    router.resetConfig(
      [
        {
          path: '**',
          resolve: { _: ModuleInitializerService },
          component: AppComponent
        }
      ]
    );
  }
}

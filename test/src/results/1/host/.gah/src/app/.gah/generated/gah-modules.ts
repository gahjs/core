
import * as core from '@awdware/core';

import * as shared from '@awdware/shared';

import * as led from '@awdware/led';

import * as blog from '@awdware/blog';

export const modulePackages = [
  {
    moduleName: "core",
    module: core,
    isEntry: true,
    isLibraryOnly: false,
    parentGahModule: null
  },
  {
    moduleName: "shared",
    module: shared,
    isEntry: false,
    isLibraryOnly: false,
    parentGahModule: null
  },
  {
    moduleName: "led",
    module: led,
    isEntry: false,
    isLibraryOnly: false,
    parentGahModule: null
  },
  {
    moduleName: "blog",
    module: blog,
    isEntry: false,
    isLibraryOnly: false,
    parentGahModule: null
  }
];

export const gahModules = [
  core.CoreModule,
  shared.AwdwareCoreSharedModule,
  led.LedLazyModule,
  blog.AwdwareLazyBlogModule
];

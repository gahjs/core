<% 
const moduleImports = [];
modules.forEach(mod => { %>
import * as <%- mod.saveName %> from '@gah/<%- mod.name %>/*';
<% });
%>
export const modulePackages = [
<%- modules.map(x => {
return `  {
    module: ${x.saveName},
    isEntry: ${x.isEntry},
    isLibraryOnly: ${x.isLibraryOnly},
  }`;
  }).join(',\n') %>
];

export const gahModules = [
<%- modules.filter(x => !x.isLibraryOnly).map(x => '  ' + x.saveName + '.' + x.baseModuleName).join(',\n') %>
];

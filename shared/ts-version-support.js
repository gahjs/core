const { execSync } = require('child_process');


const tsVersion = '3.4';

execSync('yarn downlevel-dts ./lib ./type-compat/ts' + tsVersion);

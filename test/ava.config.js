export default {
  nonSemVerExperiments: {
    configurableModuleFormat: true
  },
  files: [
    "src/tests/**/*"
  ],
  require: [
    'ts-node/register',
    // 'tsconfig-paths/register'
  ],
  concurrency: 1,
  failWithoutAssertions: false,
  verbose: true,
  timeout: '5m',
  babel: true,
  extensions: [
    "ts"
  ],
  testOptions: {
    presets: ["@babel/preset-env"]
  }

};

// module.exports = {​​​​
//   nonSemVerExperiments: {​​​​
//         configurableModuleFormat: true
//   }​​​​,
//   extensions: {​​​​
//         ts: 'commonjs'
//   }​​​​,
//   environmentVariables:{​​​​
//     'TS_NODE_PROJECT': 'tsconfig.spec.json'
//   }​​​​,
//   require: [
//     'ts-node/register',
//     'tsconfig-paths/register'
//   ],
//   timeout: '2m'
// }​​​​;

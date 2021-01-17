// process.env.DEBUG = 'mocha*'

module.exports = ({
  timeout: 999999,
  color: true,
  require: [
    "ts-node/register"
  ],
  reporter: "xunit",
  reporterOptions: [
    'output=results/test-results.xml',
    'suiteName=Gah tests'
  ],
  fullStackTrace: true,
  retries: 0,
  parallel: false
});

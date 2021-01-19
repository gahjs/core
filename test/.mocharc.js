// process.env.DEBUG = 'mocha*'

module.exports = ({
  timeout: 999999,
  color: true,
  require: [
    "ts-node/register"
  ],
  reporter: "mocha-junit-reporter",
  reporterOptions: [
    'output=results/test-results.xml'
  ],
  fullStackTrace: true,
  retries: 0,
  parallel: false
});

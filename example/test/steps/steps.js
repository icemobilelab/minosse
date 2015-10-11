var path = require('path');

module.exports = function myCustomSteps() {
    require('minosse').call(this);
    this.Before(function loadTestConfig(scenario, done) {
        // minosse checks for `testConfig` for framework configuration
        this.testConfig = {
            // look here for request configs
            // https://github.com/icemobilelab/minosse/wiki/Steps#send-a-request
            defaultHost: 'localhost',
            defaultPort: 3000,
            // look here for testdata configs
            // https://github.com/icemobilelab/minosse/wiki/Types#testdata-value
            testDataRoot: path.join(__dirname, '../data')
        };
        done();
    });
};

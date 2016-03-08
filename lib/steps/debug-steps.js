var util = require('util');

module.exports = function apiSteps() {
    function print(content) {
        var prettyContent = util.inspect(content, { colors: true, depth: null });
        console.log(prettyContent);
    }

    this.Then(/^DEBUG I print property (.+)$/, function(propertyString, done) {
        var value = this.getProperty(propertyString);
        print(value);
        done();
    });

    this.Then(/^DEBUG I eval (.+)$/, function(evalString, done) {
        global.assert = require('assert');
        eval.call(this, evalString);
        done();
    });
};

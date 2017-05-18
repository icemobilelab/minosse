var assert = require('assert');
var objTree = require('../obj-tree');
var crypto = require('crypto');
var stream = require('stream');
var fs = require('fs');
var _ = require('lodash');

function pathFromPropertyString(propertyString) {
    var propertyRegex = /^(\S+)(?: of ([\w ]+))?$/;
    var matches = propertyRegex.exec(propertyString);
    if (!matches) {
        return propertyString;
    }
    var path = matches[1];
    var rootProperty = matches[2];
    if (rootProperty) {
        path = [rootProperty, path].join('.');
    }
    //Turn foo[5] into foo.[5]. Do not touch foo.[5].
    path = path.replace(/\.?\[/g, '.[');
    return path;
}

module.exports = function propertySteps() {
    this.World.prototype.getProperty = function getProperty(propertyString) {
        var path = pathFromPropertyString(propertyString);
        this._log.debug({ path: path }, 'Getting property.');
        var value = objTree.get(this, path);
        return value;
    };

    this.World.prototype.setProperty = function setProperty(propertyString, value) {
        var path = pathFromPropertyString(propertyString);
        this._log.debug({ path: path, value: value }, 'Setting property.');
        objTree.set(this, path, value);
    };

    this.World.prototype.parseValueString = function parseValueString(typeValueString) {
        var valueRegex = /^(\S+) ?(.+)?$/;
        var matches = valueRegex.exec(typeValueString);
        var type = matches[1];
        var valueString = matches[2];
        var value = this.parse(type, valueString);
        return value;
    };

    this.World.prototype.parsers = require('../parsers');
    this.World.prototype.parse = function parse(type, valueString) {
        //We're parsing an array. Find out what type of array.
        if (/-array$/.test(type)) {
            var subType = type.split('-')[0];
            return valueString.split(',').map(parse.bind(this, subType));
        }

        var parser = this.parsers[type];
        if (!parser) {
            throw new Error('Setting property of unknown type: ' + type);
        }

        var value = parser.call(this, valueString);
        return value;
    };

    /**
     * Set a property to a certain value.
     */
    this.Given(/^I set (?:property|the) (.+) to (.+)$/,
               function(propertyString, valueString, done) {
        this._log.info('Step: I set property %s to %s', propertyString, valueString);
        var value = this.parseValueString(valueString);
        this.setProperty(propertyString, value);
        done();
    });

    /**
     * I compare the members of two arrays
     */
    this.Given(/^I check (?:property|the) (.+?) (only |)contains the members of (?:property|the) (\S+)$/,
            function(actualPropertyString, onlyString, expectedPropertyString, done) {
        this._log.info('Step: I check property %s %s contains the members of %s',
            actualPropertyString, onlyString, expectedPropertyString);
        var actual = this.getProperty(actualPropertyString);
        var expected = this.getProperty(expectedPropertyString);

        this._log.info({expected: expected}, 'Expected property');

        // Check that we deal with arrays
        if (!_.isArray(actual) || !_.isArray(expected)) {
            this._log.debug({
                actualIsArray: _.isArray(actual),
                expectedIsArray: _.isArray(expected)
            }, 'Conditions not met');
            throw new Error('"Contains" step allow checks just on type array');
        }

        // if 'only' is specified, we check that the actual property only contains the expected properties
        // otherwise, we check if the expected property members are present amongst possible other members
        if (onlyString === 'only ') {
            assert.equal(actual.length, expected.length, 'Properties do not have the same length');
        }

        expected.forEach(function (expectedValue) {
            assert.ok(~actual.indexOf(expectedValue),
                'Expected member ' + expectedValue + ' not found in actual array');
        });

        done();
    });

    /**
     * I check if a property shich is an Array or an Object contains a certain value
     */
    this.Given(/^I check (?:property|the) (.+?) contains an object with a property named (\S+) of (.+)$/,
            function(propertyString, nameString, valueString, done) {
        this._log.info('Step: I check property %s contains a property named %s of %s',
            propertyString, nameString, valueString);
        var actual = this.getProperty(propertyString);
        var expected = this.parseValueString(valueString);

        this._log.info({expected: expected}, 'Expected property');

        if (!_.isArray(actual)) {
            this._log.debug({isArray: _.isArray(actual)}, 'Conditions not met');
            throw new Error('"Contains" step allow checks just on type array');
        }

        var check = {};
        check[nameString] = expected;

        assert.equal(true, _.some(actual, check));

        done();
    });

    /**
     * Check if a property has a certain value or not
     */
    this.Given(/^I check (?:property|the) (.+?) (equals|does not equals) (.+)$/,
               function(propertyString, check, valueString, done) {
        this._log.info('Step: I check property %s %s %s', propertyString, check, valueString);
        checkProperty.apply(this, arguments);
        done();
    });
    function checkProperty(propertyString, check, valueString) {
        var actual = this.getProperty(propertyString);
        var expected = this.parseValueString(valueString);

        compare.call(this, actual, check, expected);
    }

    function compare(actual, check, expected) {
        if (isFile(actual) && isFile(expected)) {

            actual = checksum(actual);
            expected = checksum(expected);
        }

        this._log.trace({ expected: expected, actual: actual }, 'Comparing values.');

        if (check === 'equals'){
            assert.deepEqual(actual, expected);
        } else {
            assert.notDeepEqual(actual, expected);
        }
    }
    //Make this step function available to other modules.
    this.World.prototype._checkProperty = checkProperty;

    /**
     * Check if a property has a certain type.
     */
    this.Given(/^I check (?:property|the) (.+) has type (\S+)$/,
               function(propertyString, expected, done) {
        this._log.info('Step: I check property %s has type %s', propertyString, expected);
        if (expected === 'array') {
            // custom array validation since 'typeof []' returns 'object'
            assert.strictEqual(Array.isArray(this.getProperty(propertyString)), true);
            return done();
        }
        var actual = typeof this.getProperty(propertyString);
        this._log.trace({ expected: expected, actual: actual }, 'Comparing types.');
        assert.deepEqual(actual, expected);
        done();
    });

    /**
     * Check if a property has a certain format.
     */
    this.Given(/^I check (?:property|the) (.+) (has format|does not have format) (.+)$/,
               function(propertyString, checkType, format, done) {
        this._log.info('Step: I check property %s %s %s', propertyString, checkType, format);
        var negated = (checkType === 'does not have format');
        var property = this.getProperty(propertyString);
        var formatComponents = format.split(' ');
        var baseFormat = formatComponents.shift();
        var formatExtension = formatComponents.join(' ') || void 0;
        var formatValidator = this.formatValidators[baseFormat];
        this._log.trace({ format: baseFormat, extension: formatExtension, property: property },
                        'Checking format.');
        if (!formatValidator) {
            throw new Error('Unknown format validator: ' + baseFormat);
        }
        var isValid = formatValidator(property, formatExtension);
        if (negated && isValid) {
            throw new Error('Property ' + property + ' does have format: ' + format);
        }
        if (!negated && !isValid) {
            throw new Error('Property ' + property + ' does not have format: ' + format);
        }
        done();
    });

    /**
     * Remove a property.
     */
    this.Given(/^I remove (?:property|the) (.+)$/, function(propertyString, done) {
        this._log.info('Step: I remove property %s', propertyString);
        var path = pathFromPropertyString(propertyString);
        this._log.debug({ path: path }, 'Removing property.');
        objTree.remove(this, path);
        done();
    });

    /**
     * Check if a property is not returned.
     */
    this.Given(/^I check (?:property|the) (.+) does not exist$/, function(property, done) {
        this._log.info('Step: I check property %s does not exist', property);
        var actual = this.getProperty(property);
        this._log.trace({ expected: undefined, actual: actual }, 'Comparing.');
        assert.deepEqual(actual, undefined);
        done();
    });

    /**
     * Check if an array has desired number of elements
     */
    this.Given(/^I check (?:property|the) (.+) array has (\d+) elements?$/, function(property, length, done) {
        this._log.info('Step: I check property %s array has %s element(s)', property, length);
        length = parseInt(length);
        var actual = this.getProperty(property);
        if (!Array.isArray(actual)) {
            throw new Error('Property ' + property + ' is not an array');
        }
        assert.strictEqual(actual.length, length);
        done();
    });

    function isStream(obj) {
        return obj instanceof stream.Stream;
    }

    function isFile(file) {
        return (isStream(file) || Buffer.isBuffer(file));
    }

    function checksum(obj, algorithm, encoding) {
        var file = Buffer.isBuffer(obj) ? obj : fs.readFileSync(obj.path);
        return crypto
            .createHash(algorithm || 'md5')
            .update(file)
            .digest(encoding || 'hex');
    }

};

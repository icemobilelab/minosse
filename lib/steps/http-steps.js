var url = require('url');
var assert = require('assert');
var request = require('request');
var async = require('async');
var objTree = require('../obj-tree');

var JSON_TYPE = 'application/json';
var FORM_TYPE = 'multipart/formdata';

module.exports = function httpSteps() {
    this.Before(function(done) {
        var _this = this;

        createEmptyRequest.call(this);

        //Make 'request body' a proxy for req.body.
        Object.defineProperty(this, 'request body', {
            get: function getBody() {
                return _this.req.body;
            },
            set: function setBody(body) {
                _this.req.body = body;
            }
        });

        //Make 'request headers' a proxy for req.headers.
        Object.defineProperty(this, 'request headers', {
            get: function getHeaders() {
                return _this.req.headers;
            },
            set: function setHeaders(headers) {
                _this.req.headers = headers;
            }
        });
        done();
    });

    function createEmptyRequest() {
        this.req = {
            body: {},
            headers: {},
            encoding: null
        };
    }

    /*
     * Add arbitrary headers to the request
     */
    this.Given(/^I secure the connection with certificate (.+) and with key (.+)$/,
            function addHeader(certValueString, keyValueString, done) {
        this._log.info('Step: I secure the connection with certificate %s and with key %s',
            certValueString, keyValueString);
        this.req.agentOptions = {
            cert: this.parseValueString(certValueString),
            key: this.parseValueString(keyValueString)
        };
        done();
    });

    /*
     * Add arbitrary headers to the request
     */
    this.Given(/^I set the request header (\S+) with value (\S+)$/, function addHeader(headerName, headerValue, done) {
        this._log.info('Step: I set the request header %s with value %s', headerName, headerValue);
        this.req.headers[headerName] = headerValue;
        done();
    });

    /**
     * Send an http request.
     */
    this.Then(/^I send a (GET|PUT|POST|DELETE|HEAD|OPTS|PATCH) request to (\S+)$/,
              function(method, path, done) {
        this._log.info('Step: I send a %s request to %s', method, path);
        var _this = this;
        makeRequest.call(this, method, path, function deleteOldReq(err) {
            if (err) {
                return done(err);
            }
            _this._log.trace('Deleting current request object');
            createEmptyRequest.call(_this);
            return done();
        });
    });

    function makeRequest(method, path, callback) {
        var _this = this;
        var matches = path.match(/\{[^}]+\}/g) || [];
        matches.forEach(function(match) {
            var property = match.substr(1, match.length - 2);
            var value = objTree.get(this, property);
            path = path.replace(match, value);
        }, this);
        var testConfig = this.testConfig || {};
        var uri = url.parse(path);
        uri.protocol = uri.protocol || testConfig.defaultProtocol || 'http:';
        uri.slashes = true;
        uri.hostname = uri.host || testConfig.defaultHost || 'localhost';
        uri.port = uri.port || testConfig.defaultPort || 8080;
        this.req = this.req || {};
        this.req.method = method;
        this.req.uri = url.format(uri);

        // set JSON true or parse file to be formData as request expects the formData like that.
        parseForContentType(this.req);

        this._log.trace({ request: this.req }, 'Sending request.');

        request(this.req, function(err, res) {
            if (err) {
                _this._log.error(err, 'Sending request failed.');
                return callback(err);
            }
            _this._log.trace({ response: res }, 'Received response.');
            //Set the response.
            _this.res = res;
            try {
                res.body = JSON.parse(res.body);
            } catch(err) {} //eslint-disable-line no-empty
            _this['response body'] = res.body;
            _this['response headers'] = res.headers;
            return callback();
        });
    }

    /* eslint-disable max-len */
    this.Then(/^I poll with a (GET|PUT|POST|DELETE|HEAD|OPTS|PATCH) request to (\S+) until (?:property|the) (.+?) (equals|does not equals) (.+)$/,
    /* eslint-enable */
                function (method, path, propertyString, check, valueString, done) {
        this._log.info('Step: I poll with a %s request to %s until %s %s %s',
                       method, path, propertyString, check, valueString);
        var testConfig = this.testConfig || {};
        var pollConfig = testConfig.polling || {};
        var duration = pollConfig.durationMs || 5000;
        var interval = pollConfig.intervalMs || 1000;
        var maxRetries = Math.floor(duration / interval);
        var _this = this;
        async.retry(maxRetries, poll, done);
        function poll(callback) {
            var currentChecker = checkResult.bind(null, callback);
            setTimeout(makeRequest.bind(_this, method, path, currentChecker), interval);
        }
        function checkResult(callback) {
            try {
                _this._checkProperty(propertyString, check, valueString);
            } catch(err) {
                _this._log.trace({ err: err }, 'Condition not yet met, continue polling.');
                return callback(err);
            }
            return callback();
        }
    });

    this.Then(/^the response status code is (\d+)$/,
              function(statusCode, done) {
        this._log.info('Step: the response status code is %s', statusCode);
        statusCode = parseInt(statusCode, 10);
        assert.strictEqual(statusCode, this.res.statusCode);
        done();
    });

    function parseForContentType(req) {
        if (req.method === 'GET') {
            delete req.body;
            return;
        }

        var headers = req.headers;
        if (!headers['Content-Type'] || headers['Content-Type'] === JSON_TYPE) {
            req.json = true;
        } else if (headers['Content-Type'] === FORM_TYPE) {
            req.formData = req.body;
            delete req.body;
        } else {
            throw new Error('Unsupported header settings. We only support applcation/json or multipart/formdata.');
        }
    }
};

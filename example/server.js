var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var util = require('util');

app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.status(200).send({
        message: 'hello world'
    });
});

app.get('/hello/:name', function (req, res) {
    var greeting = util.format('hello %s', req.params.name);
    res.status(200).send({
        message: greeting
    });
});

app.post('/hello', function (req, res) {
    var name = util.format(req.body.name);
    res.status(200).send({
        name: name
    });
});

app.post('/hello/lastName', function (req, res) {
    var name = util.format(req.body.lastName);
    res.status(200).send({
        lastName: name
    });
});

var server = app.listen(3000, function () {
    console.log('Example app listening at http://127.0.0.1:3000');
});

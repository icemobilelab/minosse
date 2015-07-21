var exec = require('child_process').exec;
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var istanbul = require('gulp-istanbul');
var runSequence = require('run-sequence');
var minimist = require('minimist');
var _ = require('lodash');

var argv = minimist(process.argv.slice(2));

require('gulp-help')(gulp);

gulp.task('test', 'Run all tests.', function(cb) {
    runSequence('lint',
                'setup-istanbul',
                'test-cucumber',
                'report-istanbul',
                cb);
});

gulp.task('test-cucumber', false, function(cb) {
    //Get the tags we need to run.
    var tags = argv.t || argv.tags || [];
    if (!_.isArray(tags)) {
        tags = [tags];
    }
    var tagArgs = tags.map(function(tag) {
        return '-t ' + tag;
    }).join(' ');

    exec(
        './node_modules/cucumber/bin/cucumber.js test/*.feature ' +
        '-r istanbul-instrumented-lib.tmp/steps.js -r test/steps/ -f pretty ' +
        tagArgs,
        function(err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            cb(err);
        });
});

gulp.task('setup-istanbul', false, function(callback) {
    /*
     * We cannot let gulp-istanbul stub out require because cucumber will start a new process.
     * Instead, we manually get the istanbul results in that new process and write it to a file.
     */
    gulp.src(['lib/**/*.js'])
        .pipe(istanbul({
            coverageVariable: 'ISTANBUL_COVERAGE'
        }))
        .pipe(gulp.dest('istanbul-instrumented-lib.tmp/'))
        .on('finish', callback);
});

gulp.task('report-istanbul', false, function() {
    //The istanbul coverage has been parked in a file for us. Feed it back to gulp-istanbul.
    global.ISTANBUL_COVERAGE = require('./coverage/istanbul-coverage');
    return gulp.src(['lib/**/*.js'])
        .pipe(istanbul.writeReports({
            coverageVariable: 'ISTANBUL_COVERAGE',
            dir: './coverage',
            reporters: ['lcov', 'text']
        }));
});

gulp.task('lint', 'Lint all js files.', function() {
    return gulp.src(['lib/**/*.js', 'test/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

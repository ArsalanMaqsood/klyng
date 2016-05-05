var gulp = require('gulp');
var mocha = require('gulp-mocha');
var sequence = require('gulp-sequence');

gulp.task('unit-tests', () => {
    return gulp.src("tests/specs/**/*.js")
           .pipe(mocha())
           .on('error', (error) => {
               console.error(error.message);
               console.error(error.stack);
               process.exit(1);
           })
           .on('end', () => process.exit(0))
});

gulp.task('non-terminating-unit-tests', () => {
    return gulp.src("tests/specs/**/*.js")
           .pipe(mocha())
           .on('error', (error) => {
               console.error(error.message);
               console.error(error.stack);
               process.exit(1);
           })
});

gulp.task('integration-tests', () => {
    return gulp.src("tests/integration/run.js")
           .pipe(mocha())
           .on('error', (error) => {
               console.error(error.message);
               console.error(error.stack);
               process.exit(1);
           })
           .on('end', () => process.exit(0))
});
gulp.task('test', sequence('non-terminating-unit-tests', 'integration-tests'));

gulp.task('default', ['test']);

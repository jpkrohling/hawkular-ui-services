'use strict';

import concat from 'gulp-concat';
import del from 'del';
import header from 'gulp-header';
import gulp from 'gulp';
import karma from 'gulp-karma';
import merge from 'merge2';
import minimist from 'minimist';
import tslint from 'gulp-tslint';
import typescript from 'gulp-typescript';
import wiredep from 'wiredep';

import tslintRules from './tslint.json';

const config = {
  main: '.',
  ts: ['src/**/*.ts'],
  tsProject: typescript.createProject({
    target: 'ES5',
    module: 'commonjs',
    declaration: true,
    removeComments: true,
    noExternalResolve: false
  })
};

gulp.paths = {
  src: 'src/rest',
  dist: 'dist',
  tmp: '.tmp',
  e2e: 'e2e'
};

gulp.task('default', ['clean', 'build']);

const paths = gulp.paths;


gulp.task('tslint', () => {
  gulp.src([paths.src + '/hawkRest.ts', paths.src + '/hawkRest-*.ts'])
    .pipe(tslint({
      rulesDirectory: './tslint-rules/'
    }))
    .pipe(tslint.report('verbose'));
});

gulp.task('scripts', () => {

  const license = tslintRules.rules['license-header'][1];

  const tsResult = gulp.src([paths.src + '/hawkRest.ts', paths.src + '/hawkRest*.ts'])
    .pipe(typescript(config.tsProject))
    .on('error', (err) => {
      console.error(err.toString());
      this.emit('end');
    });
  const jsPipe = tsResult
    .pipe(concat('hawkular-ui-service.js'))
    .pipe(header(license))
    .pipe(gulp.dest(paths.dist + '/'))
  //.pipe(concat('hawkular-ui-service.min.js'))
  //.pipe(uglify())
  //.pipe(gulp.dest(paths.dist + '/'));
  return merge([tsResult.dts.pipe(gulp.dest(paths.dist + '/defs')), jsPipe]);
});


gulp.task('clean', (done) => {
  del([paths.dist + '/', paths.tmp + '/'], done);
});


function runTests(singleRun) {
  const bowerDeps = wiredep({
    directory: 'lib',
    exclude: ['bootstrap-sass-official'],
    dependencies: true,
    devDependencies: true
  });

  const testFiles = bowerDeps.js.concat([
    paths.src + '/*.spec.js',
    paths.dist + '/*.js'
  ]);

  gulp.src(testFiles)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: (singleRun) ? 'run' : 'watch'
    }))
    .on('error', (err) => {
      // Make sure failed tests cause gulp to exit non-zero
      console.log(err);
      throw err;
    });
}

function runTestsRest(singleRun, service, options) {
  const bowerDeps = wiredep({
    directory: 'lib',
    exclude: ['bootstrap-sass-official'],
    dependencies: true,
    devDependencies: true
  });

  const testFiles = bowerDeps.js.concat([
    paths.src + '/hawkRest.spec.rest.js',
    paths.src + '/hawkRest-' + service + '*.spec.rest.js',
    paths.dist + '/*.js'
  ]);

  gulp.src(testFiles)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: (singleRun) ? 'run' : 'watch',
      client: {
        hostname: options.hostname,
        port: options.port
      }
    }))
    .on('error', (err) => {
      // Make sure failed tests cause gulp to exit non-zero
      console.log(err);
      throw err;
    });
}

const knownTestOptions = {
  string: ['hostname', 'port'],
  default: {
    hostname: process.env.HAWKULAR_TEST_HOSTNAME || 'localhost',
    port: process.env.HAWKULAR_TEST_PORT || '8080'
  }
};

const options = minimist(process.argv.slice(2), knownTestOptions);

gulp.task('test', ['scripts'], (done) => {
  runTests(true /* singleRun */, done)
});

gulp.task('test:auto', ['scripts'], (done) => {
  runTests(false /* singleRun */, done)
});

gulp.task('rest:alert', ['scripts'], (done) => {
  runTestsRest(true, 'alert', options, done)
});

gulp.task('rest:metric', ['scripts'], (done) => {
  runTestsRest(true, 'metric', options, done)
});

gulp.task('rest:inventory', ['scripts'], (done) => {
  runTestsRest(true, 'inventory', options, done)
});

gulp.task('build', ['tslint', 'scripts']);

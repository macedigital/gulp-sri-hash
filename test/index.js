/*global describe,it,before,after*/
'use strict';

var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var assert = require('assert');
var streamAssert = require('stream-assert');
var cheerio = require('cheerio');
var plugin = require('../');

var fixtures = function (glob) {
  return path.join(__dirname, 'fixtures', glob);
};

var assertCount = function(buffer, selector, num) {
  var $ = cheerio.load(buffer);
  var count = $(selector).length;
  assert.equal(count, num);
};

describe('gulp-sri-hash', function () {

  describe('plugin', function () {
    it('should know it\'s name', function () {
      assert.strictEqual(plugin.PLUGIN_NAME, 'gulp-sri-hash');
    });

    it('should be callable', function () {
      assert.strictEqual(typeof plugin, 'function');
    });
  });

  describe('plugin()', function () {

    it('should pass through null files', function (done) {
      gulp.src(fixtures('doesnotexist'))
        .pipe(streamAssert.length(0))
        .pipe(plugin())
        .pipe(streamAssert.length(0))
        .pipe(streamAssert.end(done));
    });

    it('should throw on streams', function (done) {
        gulp.src(fixtures('*.html'), {buffer: false})
          .pipe(streamAssert.length(3))
          .pipe(plugin())
          .on('error', function (err) {
            assert.equal(err.message, 'Streams are not supported!');
            done();
          });
    });

    it('should bail on unsupported hashing algorithm', function () {
      assert.throws(function() {
        return gulp.src(fixtures('*'))
          .pipe(plugin({algo: 'invalid'}))
        ;
      }, /Hashing algorithm is unsupported/);
    });

    it('should ignore missing external files', function (done) {
      var noopFile = fixtures('noop.html');
      var expectedContent = fs.readFileSync(noopFile).toString();

      gulp.src(noopFile)
        .pipe(plugin())
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first(function (file) {
          assert.strictEqual(file.contents.toString(), expectedContent);
        }))
        .pipe(streamAssert.end(done))
      ;
    });

    it('should ignore existing `integrity` attribute', function (done) {
      var ignoreFile = fixtures('ignore.html');
      var expectedContent = fs.readFileSync(ignoreFile).toString();

      gulp.src(ignoreFile)
        .pipe(plugin())
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first(function (file) {
          assert.strictEqual(file.contents.toString(), expectedContent);
        }))
        .pipe(streamAssert.end(done));
    });

    ['sha256', 'sha384', 'sha512'].forEach(function (algo) {

      it('should apply integrity hash ' + algo, function (done) {

        gulp.src([fixtures('**/*.html')], {base: __dirname + '/fixtures'})
          .pipe(plugin({algo: algo}))
          .pipe(streamAssert.length(3))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, '[integrity]', 2);
            assertCount(vinyl.contents, '[integrity="incorrect-but-must-not-be-altered"]', 2);
          }))
          .pipe(streamAssert.second(function (vinyl) {
            assertCount(vinyl.contents, '[integrity]', 0);
          }))
          .pipe(streamAssert.last(function (vinyl) {
            var checksum = require(fixtures('checksum.json'))[algo];
            var hash = [algo, checksum].join('-');
            assert.ok(vinyl.path.match(/transform\.html$/));
            assertCount(vinyl.contents, '[integrity]', 3);
            assertCount(vinyl.contents, '[integrity="'+hash+'"]', 3);
          }))
          .pipe(streamAssert.end(done))
        ;
      });

    });

    it('should apply custom selectors', function (done) {

      gulp.src(fixtures('transform.html'))
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first(function (vinyl) {
          assertCount(vinyl.contents, '[integrity]', 0);
        }))
        .pipe(plugin({selector: 'script'}))
        .pipe(streamAssert.first(function (vinyl) {
          assertCount(vinyl.contents, '[integrity]', 1);
          assertCount(vinyl.contents, 'script[integrity]', 1);
        }))
        .pipe(streamAssert.end(done))
      ;
    });

    it('should apply hashing to whitelisted prefixes', function (done) {
      gulp.src(fixtures('transform.html'))
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first(function (vinyl) {
          assertCount(vinyl.contents, 'link[href^="https://secure"][integrity]', 0);
        }))
        .pipe(plugin({prefix: 'https://secure.com'}))
        .pipe(streamAssert.first(function (vinyl) {
          assertCount(vinyl.contents, 'link[href^="https://secure"][integrity]', 1);
        }))
        .pipe(streamAssert.end(done));
    });

  });

});

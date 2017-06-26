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
        gulp.src(fixtures('flat/*.html'), {buffer: false})
          .pipe(streamAssert.length(3))
          .pipe(plugin())
          .on('error', function (err) {
            assert.equal(err.message, 'Streams are not supported!');
            done();
          });
    });

    it('should bail on unsupported hashing algorithm', function () {
      assert.throws(function() {
        return gulp.src(fixtures('**/*'))
          .pipe(plugin({algo: 'invalid'}))
        ;
      }, /Hashing algorithm is unsupported/);
    });

    it('should ignore missing external files', function (done) {
      var noopFile = fixtures('flat/noop.html');
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
      var ignoreFile = fixtures('flat/ignore.html');
      var expectedContent = fs.readFileSync(ignoreFile).toString();

      gulp.src(ignoreFile)
        .pipe(plugin())
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first(function (file) {
          assert.strictEqual(file.contents.toString(), expectedContent);
        }))
        .pipe(streamAssert.end(done));
    });

    describe('with absolute path resolution', function() {

      ['sha256', 'sha384', 'sha512'].forEach(function (algo) {

        it('should apply integrity hash ' + algo, function (done) {

          gulp.src([fixtures('flat/**/*.html')], {base: __dirname + '/fixtures/flat'})
            .pipe(plugin({algo: algo}))
            .pipe(streamAssert.length(3))
            .pipe(streamAssert.first(function (vinyl) {
              assertCount(vinyl.contents, '[integrity][crossorigin=anonymous]', 0);
              assertCount(vinyl.contents, '[integrity="incorrect-but-must-not-be-altered"]', 2);
            }))
            .pipe(streamAssert.second(function (vinyl) {
              assertCount(vinyl.contents, '[integrity]', 0);
            }))
            .pipe(streamAssert.last(function (vinyl) {
              var checksum = require(fixtures('flat/checksum.json'))[algo];
              var hash = [algo, checksum].join('-');
              assert.ok(vinyl.path.match(/transform\.html$/));
              assertCount(vinyl.contents, '[integrity][crossorigin=anonymous]', 3);
              assertCount(vinyl.contents, '[integrity="'+hash+'"][crossorigin=anonymous]', 3);
            }))
            .pipe(streamAssert.end(done))
          ;
        });

      });

      it('should apply custom selectors', function (done) {

        gulp.src(fixtures('flat/transform.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, '[integrity]', 0);
          }))
          .pipe(plugin({selector: 'script'}))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, '[integrity][crossorigin=anonymous]', 1);
            assertCount(vinyl.contents, 'script[integrity][crossorigin=anonymous]', 1);
          }))
          .pipe(streamAssert.end(done))
        ;
      });

      it('should apply hashing to whitelisted prefixes', function (done) {
        gulp.src(fixtures('flat/transform.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, 'link[href^="https://secure"][integrity]', 0);
          }))
          .pipe(plugin({prefix: 'https://secure.com'}))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, 'link[href^="https://secure"][integrity][crossorigin=anonymous]', 1);
          }))
          .pipe(streamAssert.end(done));
      });

    });

    describe('with relative path resolution', function() {

      ['sha256', 'sha384', 'sha512'].forEach(function (algo) {

        it('should apply integrity hash ' + algo, function (done) {

          var checksums = require(fixtures('nested/checksum.json'));
          var styleHash = checksums['style'][algo];
          var scriptHash = checksums['script'][algo];

          gulp.src(fixtures('nested/**/*.html'))
            .pipe(streamAssert.length(2))
            .pipe(plugin({algo: algo, relative: true}))
            .pipe(streamAssert.length(2))
            .pipe(streamAssert.first(function (vinyl) {
              assertCount(vinyl.contents, 'link[integrity="' + styleHash +'"][crossorigin=anonymous]', 3);
              assertCount(vinyl.contents, 'script[integrity="' + scriptHash + '"][crossorigin=anonymous]', 3);
              assert.ok(vinyl.path.match(/nested\/folder\/index\.html$/))
            }))
            .pipe(streamAssert.second(function (vinyl) {
              assertCount(vinyl.contents, 'link[integrity="' + styleHash + '"][crossorigin=anonymous]', 1);
              assertCount(vinyl.contents, 'script[integrity="' + scriptHash + '"][crossorigin=anonymous]', 1);
              assert.ok(vinyl.path.match(/nested\/folder\/html\/index\.html$/))
            }))
            .pipe(streamAssert.end(done));
        });

      });

      it('should apply custom selectors', function (done) {

        var checksum = require(fixtures('nested/checksum.json'))['script']['sha384'];

        gulp.src(fixtures('nested/folder/html/*.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, '[integrity]', 0);
          }))
          .pipe(plugin({selector: 'script[data-sri-hash=1]'}))
          .pipe(streamAssert.first(function (vinyl) {
            assertCount(vinyl.contents, '[integrity="' + checksum + '"][crossorigin=anonymous]', 1);
          }))
          .pipe(streamAssert.end(done));
      });

    });

  });

});

const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const assert = require('assert');
const streamAssert = require('stream-assert');
const cheerio = require('cheerio');

const flatChecksums = require('./fixtures/flat/checksum.json');
const nestedChecksums = require('./fixtures/nested/checksum.json');

const plugin = require('../');

const fixtures = glob => path.join(__dirname, 'fixtures', glob);

const assertCount = (buffer, selector, num) => {
  const $ = cheerio.load(buffer);
  const count = $(selector).length;
  assert.strictEqual(count, num);
};

describe('gulp-sri-hash', () => {
  describe('plugin', () => {
    it('should know it\'s name', () => assert.strictEqual(plugin.PLUGIN_NAME, 'gulp-sri-hash'));

    it('should be callable', () => assert.strictEqual(typeof plugin, 'function'));
  });

  describe('plugin()', () => {
    it('should pass through singular null files', done => gulp.src(fixtures('doesnotexist'), { allowEmpty: true })
      .pipe(streamAssert.length(0))
      .pipe(plugin())
      .pipe(streamAssert.length(0))
      .pipe(streamAssert.end(done)));

    it('should pass through glob of null files', done => gulp.src(fixtures('does/not/exists/**/*'), { allowEmpty: false })
      .pipe(streamAssert.length(0))
      .pipe(plugin())
      .pipe(streamAssert.length(0))
      .pipe(streamAssert.end(done)));

    it('should throw on streams', done => gulp.src(fixtures('flat/*.html'), { buffer: false })
      .pipe(streamAssert.length(3))
      .pipe(plugin())
      .on('error', (err) => {
        assert.strictEqual(err.message, 'Streams are not supported!');
        done();
      }));

    it('should bail on unsupported hashing algorithm', () => {
      assert.throws(() => gulp.src(fixtures('**/*')).pipe(plugin({ algo: 'invalid' })), /Hashing algorithm is unsupported/);
    });

    it('should ignore missing external files', (done) => {
      const noopFile = fixtures('flat/noop.html');
      const expectedContent = fs.readFileSync(noopFile).toString();

      gulp.src(noopFile)
        .pipe(plugin())
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first((file) => {
          const actualContent = file.contents.toString();
          assert.strictEqual(actualContent, expectedContent);
        }))
        .pipe(streamAssert.end(done));
    });

    it('should ignore existing `integrity` attribute', (done) => {
      const ignoreFile = fixtures('flat/ignore.html');
      const expectedContent = fs.readFileSync(ignoreFile).toString();

      gulp.src(ignoreFile)
        .pipe(plugin())
        .pipe(streamAssert.length(1))
        .pipe(streamAssert.first((file) => {
          const actualContent = file.contents.toString();
          assert.strictEqual(actualContent, expectedContent);
        }))
        .pipe(streamAssert.end(done));
    });

    describe('with absolute path resolution', () => {
      ['sha256', 'sha384', 'sha512'].forEach((algo) => {
        it(`should apply integrity hash ${algo}`, (done) => {
          gulp.src([fixtures('flat/**/*.html')], { base: `${__dirname}/fixtures/flat` })
            .pipe(plugin({ algo }))
            .pipe(streamAssert.length(3))
            .pipe(streamAssert.first((vinyl) => {
              assertCount(vinyl.contents, '[integrity][crossorigin=anonymous]', 0);
              assertCount(vinyl.contents, '[integrity="incorrect-but-must-not-be-altered"]', 2);
            }))
            .pipe(streamAssert.second((vinyl) => {
              assertCount(vinyl.contents, '[integrity]', 0);
            }))
            .pipe(streamAssert.last((vinyl) => {
              const checksum = flatChecksums[algo];
              const hash = [algo, checksum].join('-');
              assert.ok(vinyl.path.match(/transform\.html$/));
              assertCount(vinyl.contents, '[integrity]', 3);
              assertCount(vinyl.contents, `[integrity="${hash}"][crossorigin=anonymous]`, 3);
            }))
            .pipe(streamAssert.end(done));
        });
      });

      it('should apply custom selectors', (done) => {
        gulp.src(fixtures('flat/transform.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, '[integrity]', 0);
          }))
          .pipe(plugin({ selector: 'script' }))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, '[integrity]', 1);
            assertCount(vinyl.contents, 'script[integrity][crossorigin=anonymous]', 1);
          }))
          .pipe(streamAssert.end(done));
      });

      it('should apply hashing to whitelisted prefixes', (done) => {
        gulp.src(fixtures('flat/transform.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, 'link[href^="https://secure"][integrity]', 0);
          }))
          .pipe(plugin({ prefix: 'https://secure.com' }))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, '[integrity]', 5);
            assertCount(vinyl.contents, 'link[href^="https://secure"][integrity][crossorigin=anonymous]', 1);
            assertCount(vinyl.contents, 'script[src^="https://secure"][integrity][crossorigin=use-credentials]', 1);
          }))
          .pipe(streamAssert.end(done));
      });
    });

    describe('with relative path resolution', () => {
      ['sha256', 'sha384', 'sha512'].forEach((algo) => {
        it(`should apply integrity hash ${algo}`, (done) => {
          const styleHash = nestedChecksums.style[algo];
          const scriptHash = nestedChecksums.script[algo];

          gulp.src(fixtures('nested/**/*.html'))
            .pipe(streamAssert.length(2))
            .pipe(plugin({ algo, relative: true }))
            .pipe(streamAssert.length(2))
            .pipe(streamAssert.first((vinyl) => {
              const expectedPath = ['nested', 'folder', 'index.html'];
              const actualPath = vinyl.path.split(path.sep).slice(-3);

              assertCount(vinyl.contents, `link[integrity="${styleHash}"][crossorigin=anonymous]`, 3);
              assertCount(vinyl.contents, `script[integrity="${scriptHash}"][crossorigin=anonymous]`, 2);
              assertCount(vinyl.contents, `script[integrity="${scriptHash}"][crossorigin=use-credentials]`, 1);

              assert.deepStrictEqual(actualPath, expectedPath);
            }))
            .pipe(streamAssert.second((vinyl) => {
              const expectedPath = ['nested', 'folder', 'html', 'index.html'];
              const actualPath = vinyl.path.split(path.sep).slice(-4);

              assertCount(vinyl.contents, `link[integrity="${styleHash}"][crossorigin=anonymous]`, 1);
              assertCount(vinyl.contents, `script[integrity="${scriptHash}"][crossorigin=anonymous]`, 1);

              assert.deepStrictEqual(actualPath, expectedPath);
            }))
            .pipe(streamAssert.end(done));
        });
      });

      it('should apply custom selectors', (done) => {
        gulp.src(fixtures('nested/folder/html/*.html'))
          .pipe(streamAssert.length(1))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, '[integrity]', 0);
          }))
          .pipe(plugin({ selector: 'script[data-sri-hash=1]' }))
          .pipe(streamAssert.first((vinyl) => {
            assertCount(vinyl.contents, `[integrity="${nestedChecksums.script.sha384}"][crossorigin=anonymous]`, 1);
          }))
          .pipe(streamAssert.end(done));
      });
    });

    describe('cheerio integration', () => {
      it('should not needlessly escape html entities', (done) => {
        gulp.src(fixtures('apostrophe.html'))
          .pipe(streamAssert.length(1))
          .pipe(plugin())
          .pipe(streamAssert.first((vinyl) => {
            assert.strictEqual(vinyl.contents.toString(), '<html><head><title>Main Page | Amyspark’s Domain</title>\n<link href="flat/css/styles.css" rel="stylesheet" integrity="sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb" crossorigin="anonymous"></head><body></body></html>');
          }))
          .pipe(streamAssert.end(done));
      });
    });
  });
});

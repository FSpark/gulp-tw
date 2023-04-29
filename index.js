const gulp = require('gulp')
const log = require('fancy-log')
const Sass = require('gulp-sass')(require('sass'))
const path = require('path')
const { javascript } = require('./src/javascript')
const { metaBundle } = require('./src/metaBundle')
const { html } = require('./src/html')
const babel = require('gulp-babel')
/**
 *
 * @typedef {Object} sources
 * @prop {string} sources.tiddlers A glob to get the tiddler files
 * @prop {string} sources.javascript A glob to get the javascript files
 * @prop {string} sources.sass A glob to get the sass files
 */

/**
 * Creates a module with gulp tasks for processing tiddliwiki files
 * from a normal dev environment
 *
 * @param {Object} config object for configuring the generated module
 * @param {string} config.author the author of the plugin
 * @param {string} config.pluginName
 * @param {sources} config.sources definition of the input sources
 * @param {string} [config.sourceDir] relative path to source files
 * @param {string} [config.outputDir] where the compiled plugin should be output to
 * @param {string} [config.wikiDir] a directory to use as the root for the wiki server. Should contain a tiddlywiki.info file
 * @param {Array} [config.serveOptions] 
 * @param {Array} [config.buildOptions] 
 */
const main = ({
  author,
  pluginName,
  sources: _sources,
  wikiDir = './',
  sourceDir = './src',
  outputDir = './plugins',
  serveOptions = ['port=8087'],
  buildOptions = ['index']
}) => {
  const {
    serve,
    buildTw,
    stopAnyRunningServer,
    pluginInfo
  } = require('./src/tiddlywiki')({ wikiDir, serveOptions, buildOptions })
  const { annotateCss } = require('./src/annotateCss')
  const defaults = {
    sass: `${sourceDir}/**/*.scss`,
    tiddlers: `${sourceDir}/**/*.tid`,
    javascript: `${sourceDir}/**/*.js`,
    html: `${sourceDir}/**/*.html`,
    pluginInfo: `${sourceDir}/plugin.info`,
    originCopy: `${sourceDir}/overwrite/**/*.js`,
    metaBundle: `${sourceDir}/**/*.json`,
    output: path.join(outputDir, author, pluginName)
  }
  const sources = {
    ...defaults,
    ..._sources
  }
  log('Using following sources: \n', sources)
  const replaceInJs = { '@plugin': `$:/plugins/${author}/${pluginName}` }
  const babelCfg = {
    presets: ['@babel/env'],
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          root: ['./src/**'],
          alias: replaceInJs,
          loglevel: 'info'
        }
      ]
    ]
  }
  // ==================================================
  // ====================== TASKS =====================
  // ==================================================
  function sass() {
    return gulp
      .src(sources.sass)
      .pipe(Sass().on('error', Sass.logError))
      .pipe(annotateCss({ pluginName, author }))
      .pipe(gulp.dest(sources.output))
  }

  function tiddlers() {
    return gulp.src(sources.tiddlers).pipe(gulp.dest(sources.output))
  }

  function originCopy() {
    return gulp.src(sources.originCopy, { base: sourceDir }).pipe(gulp.dest(sources.output))
  }

  async function js() {
    var stripDebug = (await import('gulp-strip-debug')).default
    return gulp
      .src(sources.javascript)
      .pipe(babel(babelCfg))
      .pipe(stripDebug())
      .pipe(javascript({ author, pluginName }))
      .pipe(gulp.dest(sources.output))
  }

  function headerJS() {
    return gulp
      .src(sources.javascript)
      .pipe(babel(babelCfg))
      .pipe(javascript({ author, pluginName }))
      .pipe(gulp.dest(sources.output))
  }

  function metaHeader() {
    return gulp
      .src(sources.metaBundle, { allowEmpty: true })
      .pipe(metaBundle())
      .pipe(gulp.dest(sources.output))
  }

  function processHtml() {
    return gulp
      .src(sources.html)
      .pipe(html({ author, pluginName }))
      .pipe(gulp.dest(sources.output))
  }

  function processPluginInfo() {
    return gulp
      .src(sources.pluginInfo)
      .pipe(pluginInfo())
      .pipe(gulp.dest(sources.output))
  }

  const defaultTask = gulp.parallel(tiddlers, js, sass, processHtml, metaHeader, processPluginInfo)
  const devTask = gulp.parallel(tiddlers, headerJS, sass, processHtml, metaHeader, processPluginInfo)
  const build = gulp.series(defaultTask, originCopy)
  const buildHTML = gulp.series(defaultTask, originCopy, buildTw)

  function watch() {
    return gulp.watch(
      `${sourceDir}/**`,
      { ignoreInitial: false },
      gulp.series(devTask, originCopy, stopAnyRunningServer, serve)
    )
  }

  return {
    tiddlers,
    sass,
    serve,
    watch,
    javascript: js,
    processHtml,
    build,
    buildHTML,
    default: defaultTask
  }
}

module.exports = main

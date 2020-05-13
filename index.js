const gulp = require('gulp')
const Sass = require('gulp-sass')
const path = require('path')
const { javascript } = require('./src/javascript')
Sass.compiler = require('sass')

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
 * @param {string} config.outputDir where the compiled plugin should be output to
 */
const main = ({ author, pluginName, sources: _sources, outputDir = './plugins' }) => {
  const { serve, buildTw, stopAnyRunningServer, pluginInfo } = require('./src/tiddlywiki')
  const { annotateCss } = require('./src/annotateCss')
  const defaults = {
    sass: './src/**/*.scss',
    tiddlers: './src/**/*.tid',
    js: './src/**/*.js',
    pluginInfo: './src/plugin.info',
    output: path.join(outputDir, author, pluginName)
  }
  const sources = { ...defaults, ..._sources }
  console.log('Using following source configurations: ', sources)
  // ==================================================
  // ====================== TASKS =====================
  // ==================================================
  function sass () {
    return gulp
      .src(sources.sass)
      .pipe(Sass().on('error', Sass.logError))
      .pipe(annotateCss({ pluginName, author }))
      .pipe(gulp.dest(sources.output))
  }

  function tiddlers () {
    return gulp.src(sources.tiddlers).pipe(gulp.dest(sources.output))
  }

  function js () {
    return gulp.src(sources.js)
      .pipe(javascript({ author, pluginName }))
      .pipe(gulp.dest(sources.output))
  }

  function processPluginInfo () {
    return gulp
      .src(sources.pluginInfo)
      .pipe(pluginInfo())
      .pipe(gulp.dest(sources.output))
  }

  const defaultTask = gulp.parallel(tiddlers, js, sass, processPluginInfo)
  const build = gulp.series(defaultTask, buildTw)

  function watch () {
    return gulp.watch('./src/**', { ignoreInitial: false }, gulp.series(defaultTask, stopAnyRunningServer, serve))
  }

  return {
    tiddlers,
    sass,
    serve,
    watch,
    build,
    default: defaultTask
  }
}

module.exports = main

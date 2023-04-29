const processStream = require('read-vinyl-file-stream')
const log = require('fancy-log')
const fs = require('fs')

/**
 *
 * @param {Object} conf
 * @param {string} conf.author
 * @param {string} conf.pluginName
 */
function metaBundle() {
  /**
   * Iterates a stream of vinyl files
   * @param {string} content the file contents
   * @param {any} file The vinyl file object
   * @param {any} stream the stream itself
   * @param {Function} cb the callback to continue process chain
  */
  function iterator(content, file, stream, cb) {
    /**
     * @type {string}
    */
   const relativePath = file.relative
   log.info('Adding meta header: ', file.relative)
    const fileName = file.path + '.meta'
    let newContent
    if (fs.existsSync(fileName)) {
      file.basename = file.basename + '.tid'
      const metaContent = fs.readFileSync(fileName, 'utf-8')
      newContent = `${metaContent}

${content}
`
      cb(null, newContent)
    } else {
      log.warn(`File ${relativePath} hasn't meta file!`)
      cb(null, content)
    }
  }

  return processStream(iterator)
}

exports.metaBundle = metaBundle

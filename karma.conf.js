module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    frameworks: ['jasmine'],
    files: [
        'node_modules/js-yaml/dist/js-yaml.js',
        'node_modules/mustache/mustache.js',
        'node_modules/showdown/dist/showdown.js',
        'lib/*.js',
        'test/*.js',
        {pattern: 'test/*.yml', watched: true, served: true, included: false},
        {pattern: 'test/*.json', watched: true, served: true, included: false}
    ]
  })
}
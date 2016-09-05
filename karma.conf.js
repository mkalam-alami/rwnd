module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    frameworks: ['jasmine'],
    customContextFile: 'test/index.html',
    files: [
        'lib/*.js',
        'test/*.js',
        {pattern: 'test/style.css', included: false}
    ]
  })
}
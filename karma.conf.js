/* jshint node: true */
'use strict';

module.exports = function(config) {
    config.set({
        autoWatch: true,

        browsers: ['PhantomJS'],
        frameworks: ['jasmine'],
        reporters: ['dots', 'coverage'],

        files: [
            require.resolve('babel-polyfill/browser.js'),
            'dist/handbag.js',
            'test/**/*.spec.js'
        ],

        preprocessors: {
            'dist/handbag.js': ['coverage'],
            'test/**/*.js': ['babel']
        },

        coverageReporter: {
            dir: 'coverage/',
            reporters: [
                { type: 'html' },
                { type: 'text-summary' }
            ]
        },
    });
};

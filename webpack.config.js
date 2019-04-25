const path = require('path');

module.exports = {
    entry: {
        apiclient: 'apiclient.js',
        apiclientcore: 'apiclientcore.js',
        appStorage: 'appStorage.js',
        connectionmanager: 'connectionmanager.js',
        credentials: 'credentials.js',
        events: 'events.js',
        localassetmanager: 'localassetmanager.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(dist|node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ],
    },
    resolve: {
        modules: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, 'src'),
        ]
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: '[name]',
        libraryTarget: 'umd',
        libraryExport: 'default'
    }
};

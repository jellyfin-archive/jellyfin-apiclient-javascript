const path = require('path');

module.exports = {
    entry: {
        apiclient: 'apiclient.js',
        apiclientcore: 'apiclientcore.js',
        appStorage: 'appStorage.js',
        connectionmanager: 'connectionmanager.js',
        credentials: 'credentials.js',
        events: 'events.js',
        localassetmanager: 'localassetmanager.js',
        filerepository: 'sync/filerepository.js',
        itemrepository: 'sync/itemrepository.js',
        localsync: 'sync/localsync.js',
        mediasync: 'sync/mediasync.js',
        multiserversync: 'sync/multiserversync.js',
        serversync: 'sync/serversync.js',
        transfermanager: 'sync/transfermanager.js',
        useractionrepository: 'sync/useractionrepository.js'
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

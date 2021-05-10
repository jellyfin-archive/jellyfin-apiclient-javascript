const path = require('path');

var babelLoader = {
    loader: 'babel-loader',
    options: {
        cacheDirectory: true
    }
};

module.exports = {
    entry: {
        'jellyfin-apiclient': 'index.js'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [babelLoader]
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'src')]
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: '[name]',
        libraryTarget: 'umd',
        libraryExport: 'default'
    }
};

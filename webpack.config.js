const path = require('path');

module.exports = {
    entry: {
        'jellyfin-apiclient': 'index.js',
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
            path.resolve(__dirname, 'src')
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

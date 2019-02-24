const path = require('path');

module.exports = {
	mode: 'development',
	entry: {
		apiclient: './src/apiclient.js',
		apiclientex: './src/apiclientex.js',
		'appstorage-localstorage': './src/appstorage-localstorage.js',
		'appstorage-memory': './src/appstorage-memory.js',
		connectionmanager: './src/connectionmanager.js',
		credentials: './src/credentials.js',
		events: './src/events.js',
		localassetmanager: './src/localassetmanager.js',
		serverdiscovery: './src/serverdiscovery.js'
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
		]
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: '[name]',
		libraryTarget: 'umd',
		libraryExport: 'default'
	},
	optimization: {
		// We no not want to minimize our code.
		minimize: false
	},
	devtool: 'source-map'
};

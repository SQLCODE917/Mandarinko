const path = require('path')

const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const postCSSPlugins = [
  require('postcss-import'),
  require('postcss-url'),
  require('postcss-cssnext'),
  require('postcss-extend')
];

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, 'dist', 'assets'),
    filename: "bundle.js",
    sourceMapFilename: 'bundle.map',
    publicPath: '/'
  },
  devServer: {
    historyApiFallback: true,
  },
  devtool: '#source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          presets: ['env', 'stage-0', 'react']
        }
      },
			{
				test: /\.css$/,
				include: path.resolve('src'),
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader?sourceMap',
					use: [
						{
							loader: 'css-loader',
							options: {
								modules: true,
								camelCase: true,
								importLoaders: 1,
								localIdentName: '[name]-[local]-[hash:base64:5]'
							}
						},
						{
							loader: 'postcss-loader',
							options: {
								plugins: /* istanbul ignore next */ () => postCSSPlugins
							}
						}
					]
				})
			},
      {
        test: /\.css$/,
				exclude: path.resolve('src'),
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: [
						{ loader: 'css-loader' },
						{
							loader: 'postcss-loader',
							options: {
								plugins: /* istanbul ignore next */ () => postCSSPlugins
							}
						}
					]
				})
      }
    ] 
  },
  plugins: [
		new ExtractTextPlugin({
			filename: '[name].css'
		}),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      warnings: false,
      mangle: false
    })
  ]
}

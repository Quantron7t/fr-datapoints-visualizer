const webpack = require("webpack");
const path = require("path");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin"); // HMR plugin

module.exports = {
    mode : "development",
    devtool : "eval-cheap-module-source-map", //for more details https://webpack.js.org/configuration/devtool/
    plugins : [
        new webpack.DefinePlugin({
            'process.env.name' : JSON.stringify('environment is now development'),// keep adding new env config as required 
        }),
        new ReactRefreshWebpackPlugin() // for hot reload during development
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'src/assets'),//provides static files over localhost
        },
        hot: true, //HMR https://webpack.js.org/guides/hot-module-replacement
        open: true,
        historyApiFallback: true, //required for dev where page issue comes using react-router
    },
}
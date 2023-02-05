
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = function override(config, env) {

    config.resolve.fallback = {
        fs: false,
        os: false,
        path: false,
        module: false
    }

    config.plugins.push(new NodePolyfillPlugin({
        excludeAliases: ['console']
      }))
    return config;
  }
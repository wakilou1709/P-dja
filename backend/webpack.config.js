const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    module: {
      rules: [
        ...options.module.rules,
        {
          test: /\.html$/,
          type: 'asset/source',
        },
      ],
    },
    resolve: {
      ...options.resolve,
      fallback: {
        ...options.resolve?.fallback,
        'mock-aws-s3': false,
        'aws-sdk': false,
        'nock': false,
      },
    },
    ignoreWarnings: [
      {
        module: /node_modules\/@mapbox\/node-pre-gyp/,
      },
      {
        module: /node_modules\/bcrypt/,
      },
    ],
  };
};

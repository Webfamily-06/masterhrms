// Ensure EXPO_OS environment variable is populated to prevent Babel/Metro EXPO_OS warnings
if (!process.env.EXPO_OS) {
  process.env.EXPO_OS = 'android';
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@app': './src/app',
            '@config': './src/config',
            '@core': './src/core',
            '@modules': './src/modules',
            '@roles': './src/roles',
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@store': './src/store',
            '@theme': './src/theme',
            '@types': './src/types',
            '@utils': './src/utils',
          },
        },
      ],
    ],
  };
};

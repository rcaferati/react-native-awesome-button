const path = require('path');
const pak = require('../package.json');

module.exports = function (api) {
  api.cache(true);

  const runtimeAliases = ['react', 'react-native'].concat(
    Object.keys(pak.peerDependencies).filter((name) =>
      name.startsWith('react-native-')
    )
  );

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            // Resolve the local package source so demo changes reflect library edits.
            [pak.name]: path.join(__dirname, '..', pak.source),
            ...runtimeAliases.reduce((aliases, name) => {
              aliases[name] = path.join(__dirname, 'node_modules', name);
              return aliases;
            }, {}),
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};

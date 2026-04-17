const path = require('path');
const escape = require('escape-string-regexp');
const { getDefaultConfig } = require('@expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');

const modules = Object.keys({
  ...pak.peerDependencies,
});

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,

  projectRoot: __dirname,
  watchFolders: [root],

  // Keep peer dependencies resolved from the demo app so Metro doesn't load duplicates.
  resolver: {
    ...defaultConfig.resolver,

    blockList: exclusionList(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

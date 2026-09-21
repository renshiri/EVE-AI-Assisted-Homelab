module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WICHTIG: Muss als letztes Plugin in der Liste stehen!
      'react-native-reanimated/plugin',
    ],
  };
};
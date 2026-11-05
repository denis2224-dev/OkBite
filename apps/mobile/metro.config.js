const { getDefaultConfig } = require('expo/metro-config');

// Keep route discovery rooted in this app instead of inheriting the root preview's config.
module.exports = getDefaultConfig(__dirname);

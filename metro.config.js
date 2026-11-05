const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...[".worktrees", ".agents", ".pnpm-store", "design"].map(
    (folder) =>
      new RegExp("^" + escape(path.join(__dirname, folder)) + "(?:[/\\\\]|$)"),
  ),
];
module.exports = config;

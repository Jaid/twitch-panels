import core from "./core"

const job = async () => {
  const plugins = {}
  const pluginsRequire = require.context("./plugins/", true, /index.js$/)
  for (const value of pluginsRequire.keys()) {
    const {pluginName} = value.match(/[/\\](?<pluginName>.+?)[/\\]index\.js$/).groups
    plugins[pluginName] = pluginsRequire(value).default
  }
  await core.init(plugins)
}

job()
import core from "./core"

function logError(message) {
  if (core?.logger?.error) {
    core.logger.error(message)
  } else {
    console.error(message)
  }
}

async function job() {
  const plugins = {}
  const pluginsRequire = require.context("./plugins/", true, /index.js$/)
  for (const value of pluginsRequire.keys()) {
    const {pluginName} = value.match(/[/\\](?<pluginName>.+?)[/\\]index\.js$/).groups
    plugins[pluginName] = pluginsRequire(value).default
  }
  await core.init(plugins)
}

process.on("unhandledRejection", error => {
  if (error) {
    logError(`Unhandled promise rejection: ${error?.message || error}`)
  } else {
    logError("Unhandled promise rejection")
  }
  if (error?.stack) {
    logError(error.stack)
  }
})

job().catch(error => {
  logError("Core process crashed")
  logError(error)
  process.exit(1)
})
import yargs from "yargs"

import core from "./core"

function logError(message) {
  if (core?.logger?.error) {
    core.logger.error(message)
  } else {
    console.error(message)
  }
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

async function job() {
  const plugins = {}
  const pluginsRequire = require.context("./plugins/", true, /^\.\/\w+\/index.js$/)
  for (const value of pluginsRequire.keys()) {
    const {pluginName} = value.match(/[/\\](?<pluginName>.+?)[/\\]index\.js$/).groups
    plugins[pluginName] = pluginsRequire(value).default
  }
  await core.init(plugins)
}

function main() {
  job().catch(error => {
    logError("Core process crashed")
    logError(error)
    process.exit(1)
  })
}

yargs
  .scriptName(_PKG_NAME)
  .version(_PKG_VERSION)
  .command("$0", _PKG_DESCRIPTION, main)
  .argv
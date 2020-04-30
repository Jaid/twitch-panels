import readableMs from "readable-ms"
import yargs from "yargs"

import core from "./core"

/**
 * @param {*} message
 * @param {string} [level="info"]
 */
function log(message, level = "info") {
  if (core?.logger?.[level]) {
    core.logger[level](message)
  } else {
    console[level](message)
  }
}

process.on("unhandledRejection", error => {
  log("Unhandled promise rejection", "error")
  log(error, "error")
})

process.on("exit", code => {
  log(`Exiting with code ${code} after ${readableMs(Date.now() - core.startTime)}`)
})

/**
 * @return {Promise<void>}
 */
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
    log("Core process crashed", "error")
    log(error, "error")
    process.exit(1)
  })
}

yargs
  .scriptName(_PKG_NAME)
  .version(_PKG_VERSION)
  .command("$0", _PKG_DESCRIPTION, main)
  .argv
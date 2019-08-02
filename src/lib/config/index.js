import essentialConfig from "essential-config"
import logger from "lib/logger"

import defaults from "./defaults.yml"

const configResult = essentialConfig(_PKG_TITLE, {
  defaults,
  sensitiveKeys: ["databasePassword"],
})

/**
 * @typedef {Object} Config
 * @prop {string} databaseHost
 * @prop {string} databaseName
 * @prop {string} databaseUser
 * @prop {number} databasePort
 * @prop {string} databasePassword
 * @prop {"alter"|"sync"|"force"|"none"} databaseSchemaSync
 */

/**
 * @type {Config}
 */
const config = configResult.config

if (!config) {
  logger.warn("Set up default config, please edit and restart")
  process.exit(2)
}

/**
 * @type {string}
 */
export const appFolder = config.configFolder

export default config
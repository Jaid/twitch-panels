import jaidLogger from "jaid-logger"

const logger = jaidLogger(_PKG_TITLE)

logger.info(`${_PKG_TITLE} v${_PKG_VERSION}`)

export const log = logger.info
export default logger
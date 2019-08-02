import JaidCore from "jaid-core"

const core = new JaidCore({
  name: _PKG_TITLE,
  version: _PKG_VERSION,
  useGot: false,
  insecurePort: 19156,
})

export const logger = core.logger
export const got = core.got

export default core
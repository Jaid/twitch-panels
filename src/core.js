import JaidCore from "jaid-core"

const core = new JaidCore({
  name: _PKG_TITLE,
  version: _PKG_VERSION,
  gotLogLevel: "info",
  configSetup: {
    defaults: {
      twitchUser: "jaidchen",
      outputFolder: true,
      panels: [
        {
          title: "hi",
          content: "Test",
        },
      ],
    },
    sensitiveKeys: ["twitchPassword"],
  },
})

export const logger = core.logger
export const got = core.got
export const config = core.config
export const appFolder = core.appFolder

export default core
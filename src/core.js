import JaidCore from "jaid-core"

const core = new JaidCore({
  name: _PKG_TITLE,
  version: _PKG_VERSION,
  useGot: false,
  configSetup: {
    defaults: {
      outputFolder: true,
      panels: [
        {
          title: "hi",
          content: "Test",
        },
      ],
    },
  },
})

export const logger = core.logger
export const got = core.got

export default core
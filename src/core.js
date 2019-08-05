import JaidCore from "jaid-core"

const core = new JaidCore({
  name: _PKG_TITLE,
  version: _PKG_VERSION,
  gotLogLevel: "info",
  configSetup: {
    defaults: {
      dry: true,
      twitchUser: "jaidchen",
      outputFolder: true,
      panels: [
        {
          title: "hi",
          content: "Test",
        },
      ],
      commands: [
        {
          command: "!hi",
          example: "!hi abc",
        },
      ],
      answers: [
        {
          question: "What is your password?",
          answer: "hunter2",
        },
      ],

    },
    sensitiveKeys: ["twitchApiToken", "twitchAccessToken"],
  },
})

export const logger = core.logger
export const got = core.got
export const config = core.config
export const appFolder = core.appFolder

export default core
import JaidCore from "jaid-core"

const core = new JaidCore({
  name: _PKG_TITLE,
  version: _PKG_VERSION,
  gotLogLevel: "info",
  useGot: true,
  configSetup: {
    defaults: {
      dry: true,
      twitchUser: "jaidchen",
      outputFolder: true,
      twitchWebClientId: "kimne78kx3ncx6brgo4mv6wki5h1ko",
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
    secretKeys: [
      "twitchApiToken",
      "twitchAccessToken",
    ],
  },
})

/**
 * @typedef {Object} Panel
 * @prop {string} title
 * @prop {string} content
 * @prop {string} themeColor
 * @prop {string} icon
 * @prop {string} link
 */

/**
 * @typedef {Object} Answer
 * @prop {string} question
 * @prop {string} answer
 * @prop {Panel} panel
 */

/**
 * @typedef {Object} Command
 * @prop {string} command
 * @prop {string} description
 * @prop {string} example
 * @prop {Panel} panel
 */

/**
 * @typedef {Object} Config
 * @prop {string} twitchUser
 * @prop {Panel[]} panels
 * @prop {boolean} dry
 * @prop {boolean|string} outputFolder
 * @prop {Command[]} commands
 * @prop {Answer[]} answers
 * @prop {string} twitchWebClientId
 */

/**
 * @type {import("jaid-logger").JaidLogger}
 */
export const logger = core.logger

/**
 * @type {import("got").GotInstance}
 */
export const got = core.got

/**
 * @type {import("jaid-core").BaseConfig & Config}
 */
export const config = core.config

/**
 * @type {string}
 */
export const appFolder = core.appFolder

export default core
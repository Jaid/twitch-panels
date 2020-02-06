import fsp from "@absolunet/fsp"
import ensureArray from "ensure-array"
import {isEmpty} from "has-content"
import {JaidCorePlugin} from "jaid-core"
import {isNumber, isString, random} from "lodash"
import path from "path"
import puppeteer from "puppeteer"
import {stringify} from "query-string"
import readFileYaml from "read-file-yaml"
import sharp from "sharp"
import {Cookie, CookieJar} from "tough-cookie"
import CookieFileStore from "tough-cookie-file-store"
import UserAgent from "user-agents"
import delay from "delay"
import pRetry from "p-retry"

import {appFolder} from "src/core"

const userAgentRoller = new UserAgent({deviceCategory: "tablet"})

const addons = ["panels", "answers", "commands"]

export default class extends JaidCorePlugin {

  /**
   * @type {import("got").Got}
   */
  got = null

  async init() {

  }

  handleConfig(config) {
    this.config = config
  }

  handleGot(got) {
    this.got = got
  }

  async ready() {
    /**
     * @type {import("puppeteer").Browser}
     */
    let browser
    try {
      const outputFolder = isString(this.config.outputFolder) ? this.config.outputFolder : "dist/panels"
      await fsp.emptyDir(outputFolder)
      browser = await puppeteer.launch({
        defaultViewport: {
          width: 320,
          height: 600,
        },
        devtools: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--font-render-hinting=medium",
          "--enable-font-antialiasing",
        ],
      })
      const panelDescriptions = []
      for (const addon of addons) {
        const file = path.join(this.core.appFolder, `${addon}.yml`)
        this.log(`Reading ${file}`)
        const data = await readFileYaml(file)
        if (data === null) {
          continue
        }
        if (isEmpty(data)) {
          continue
        }
        this[addon] = ensureArray(data)
        this.log(`Loaded ${addon}: ${this[addon].length}`)
        const addonHandler = require(`../../panelTypes/${addon}`).default
        Array.prototype.push.apply(panelDescriptions, addonHandler(this[addon]))
      }
      const rainbowStartHue = random(360)
      const renderPanelsJobs = panelDescriptions.map(async (panel, index) => {
        const query = {
          contentFont: "Lexend Deca",
          centerFont: "Blinker",
          centerFontSize: 18,
          titleUppercase: "",
          hasLink: panel.link ? "1" : "",
          mode: "output",
          ...panel,
        }
        if (this.config.rainbow |> isNumber) {
          query.themeColor = `hsl(${rainbowStartHue + index * this.config.rainbow}, 100%, 47%)`
        }
        if (query.points) {
          query.content = query.content || ""
          query.content += "{br:6}"
          query.content += ensureArray(query.points).map(line => `{center:${line}}`).join("{br:2}")
        }
        const panelUrl = `https://panel.jaid.codes?${stringify(query)}`
        const indexString = String(index + 1).padStart(3, 0)
        this.log(`Rendering ${indexString}: ${query.title || "(no title)"}`)
        this.logDebug(`https://panel.jaid.codes?${stringify(query)}`)
        const page = await browser.newPage()
        await page.goto(panelUrl, {waitUntil: "domcontentloaded"})
        await page.waitForSelector("body div")
        await delay(1000)
        const buffer = await page.screenshot({
          omitBackground: true,
        })
        await page.close()
        const sharpImage = sharp(buffer)
        sharpImage.trim()
        sharpImage.png()
        const imageMeta = await sharpImage.metadata()
        const imageBuffer = await sharpImage.toBuffer()
        const fileName = `${indexString}.png`
        await fsp.outputFile(path.join(outputFolder, fileName), imageBuffer)
        return {
          imageBuffer,
          imageMeta,
          query,
        }
      })
      const panels = await Promise.all(renderPanelsJobs)
      if (this.config.dry) {
        this.log("Ended early, because this was a dry run")
        process.exit(0)
      }
      const cookieFile = path.join(appFolder, "cookies.json")
      const cookieStore = new CookieFileStore(cookieFile)
      const cookieJar = new CookieJar(cookieStore)
      const cookies = {
        api_token: this.config.twitchApiToken,
        "auth-token": this.config.twitchAccessToken,
      }
      for (const [key, value] of Object.entries(cookies)) {
        const cookie = new Cookie({
          key,
          value,
          domain: "twitch.tv",
          pathIsDefault: true,
          secure: true,
        })
        cookieJar.setCookieSync(cookie, "https://twitch.tv")
      }
      const sessionGot = this.got.extend({
        headers: {
          "Accept-Language": "en-US",
          "User-Agent": userAgentRoller.random().toString(),
          "Client-Id": this.config.twitchWebClientId,
          Authorization: `OAuth ${this.config.twitchAccessToken}`,
          "Content-Type": "text/plain;charset=UTF-8",
        },
        cookieJar,
      })
      const gqlGot = sessionGot.extend({
        prefixUrl: "https://gql.twitch.tv/gql",
        method: "post",
        responseType: "json",
        hooks: {
          beforeRequest: [
            request => {
              request.body = JSON.stringify(ensureArray(request.body))
              return request
            },
          ],
        },
      })
      const verifyEmailResponse = await gqlGot({
        body: {
          operationName: "VerifyEmail_CurrentUser",
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "f9e7dcdf7e99c314c82d8f7f725fab5f99d1df3d7359b53c9ae122deec590198",
            },
          },
        },
      })
      const twitchId = verifyEmailResponse.body[0].data?.currentUser?.id
      if (!twitchId) {
        throw new Error("Not logged in!")
      }
      const channelPanelsResponse = await gqlGot({
        body: {
          operationName: "ChannelPanels",
          variables: {id: twitchId},
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "236b0ec07489e5172ee1327d114172f27aceca206a1a8053106d60926a7f622e",
            },
          },
        },
      })
      const panelOrder = []
      const extensionPanelIds = []
      const channelPanels = channelPanelsResponse.body[0].data.user.panels
      for (const channelPanel of channelPanels) {
        if (channelPanel.type.toLowerCase() === "extension") {
          this.log(`Keeping panel #${channelPanel.id}, it's an extension`)
          extensionPanelIds.push(channelPanel.id)
        }
      }
      if (this.config.extensionsOnTop) {
        for (const extensionPanelId of extensionPanelIds) {
          panelOrder.push(extensionPanelId)
        }
      }
      const deleteChannelPanelJobs = channelPanels.filter(({type}) => type.toLowerCase() === "default").map(async ({id}) => {
        await gqlGot({
          body: {
            operationName: "ChannelPanelsDeletePanel",
            variables: {
              input: {
                id,
                type: "DEFAULT",
              },
            },
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "9c0664f015f542319bc15a338a4f489789803bd32c3d3f51b46777728045e3bc",
              },
            },
          },
        })
      })
      await Promise.all(deleteChannelPanelJobs)
      for (const panel of panels) {
        const createChannelPanelResponse = await gqlGot({
          body: {
            operationName: "ChannelPanelsCreatePanel",
            variables: {
              input: {
                channelID: twitchId,
                type: "DEFAULT",
              },
            },
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "b48b02ec8bf74c237d95efbbeff3bb73f8955b5305c5ac2a234baee5f0a06d61",
              },
            },
          },
        })
        const newPanelId = createChannelPanelResponse.body[0].data.createPanel.panel.id
        panelOrder.push(newPanelId)
      const initUpload = async () => {
        const uploadPanelImageResponse = await sessionGot.post(`https://api.twitch.tv/v5/users/${twitchId}/upload_panel_image`, {
          json: {
            left: 0,
            top: 0,
            width: panel.imageMeta.width,
            height: panel.imageMeta.height,
          },
          headers: {
            Accept: "application/vnd.twitchtv.v5+json; charset=UTF-8",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Twitch-Api-Token": this.config.twitchApiToken,
          },
        })
        return uploadPanelImageResponse
      }
        const uploadPanelImageResponse = await pRetry(initUpload, {
          retries: 5,
          onFailedAttempt: () => {
            this.logWarn("Retry...")
          }
        })
        const {url: uploadUrl, upload_id: uploadId} = JSON.parse(uploadPanelImageResponse.body)
        await this.got.put(uploadUrl, {
          body: panel.imageBuffer,
        })
        await gqlGot({
          body: {
            operationName: "ChannelPanelsUpdatePanel",
            variables: {
              input: {
                id: newPanelId,
                description: "",
                title: "",
                linkURL: panel.query.link || "",
                imageURL: `https://panels-images.twitch.tv/panel-${twitchId}-image-${uploadId}`,
              },
            },
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "d6edd5143b243785d26200074f7cf287f7fc7484be7b866fd86eec4ed80fb16b",
              },
            },
          },
        })
      }
      if (!this.config.extensionsOnTop) {
        for (const extensionPanelId of extensionPanelIds) {
          panelOrder.push(extensionPanelId)
        }
      }
      await gqlGot({
        body: {
          operationName: "ChannelPanelsOrderPanels",
          variables: {
            input: {
              ids: panelOrder,
            },
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: "c94ed25caf158e3c976b8df8f1875970046ada6aeebf47b8eac3f5208a65828b",
            },
          },
        },
      })
    } catch (error) {
      this.logError("Failed to run %s", error)
      debugger
    }
    await browser?.close()
  }

}
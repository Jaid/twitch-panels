import path from "path"

import puppeteer from "puppeteer"
import sharp from "sharp"
import {stringify} from "query-string"
import {isString, isNumber, random, padStart} from "lodash"
import fsp from "@absolunet/fsp"
import {CookieJar, Cookie} from "tough-cookie"
import {logger, config, got, appFolder} from "src/core"
import UserAgent from "user-agents"
import CookieFileStore from "tough-cookie-file-store"
import hasContent from "has-content"
import ensureArray from "ensure-array"

const userAgentRoller = new UserAgent({deviceCategory: "tablet"})

const addons = ["answers", "commands"]

export default class {

  async ready() {
    /**
     * @type {import("puppeteer").Browser}
     */
    let browser
    try {
      const outputFolder = isString(config.outputFolder) ? config.outputFolder : "dist/panels"
      await fsp.emptyDir(outputFolder)
      browser = await puppeteer.launch({
        defaultViewport: {
          width: 320,
          height: 600,
          isLandscape: true,
        },
        devtools: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--font-render-hinting=medium",
          "--enable-font-antialiasing",
        ],
      })
      const panelDescriptions = [...config.panels || []]
      for (const addon of addons) {
        const addonHandler = require(`../../panelTypes/${addon}`).default
        if (config[addon] |> hasContent) {
          Array.prototype.push.apply(panelDescriptions, addonHandler(config[addon]))
        }
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
        if (config.rainbow |> isNumber) {
          query.themeColor = `hsl(${rainbowStartHue + index * config.rainbow}, 100%, 47%)`
        }
        if (query.points) {
          query.content = query.content || ""
          query.content += "{br:6}"
          query.content += ensureArray(query.points).map(line => `{center:${line}}`).join("{br:2}")
        }
        const panelUrl = `https://panel.jaid.codes?${stringify(query)}`
        logger.info("Rendering %s?%s", "https://panel.jaid.codes", stringify(query))
        const page = await browser.newPage()
        await page.goto(panelUrl)
        await page.evaluateHandle("document.fonts.ready")
        const buffer = await page.screenshot({
          omitBackground: true,
        })
        await page.close()
        const sharpImage = sharp(buffer)
        sharpImage.trim()
        sharpImage.png()
        const imageMeta = await sharpImage.metadata()
        const imageBuffer = await sharpImage.toBuffer()
        const fileName = `${padStart(index + 1, 3, 0)}.png`
        await fsp.outputFile(path.join(outputFolder, fileName), imageBuffer)
        return {
          imageBuffer,
          imageMeta,
          query,
        }
      })
      const panels = await Promise.all(renderPanelsJobs)
      panels.reverse() // Twitch panel editor needs them in reverse order
      if (config.dry) {
        logger.info("Ended early, because this was a dry run")
        process.exit(0)
      }
      const cookieFile = path.join(appFolder, "cookies.json")
      const cookieStore = new CookieFileStore(cookieFile)
      const cookieJar = new CookieJar(cookieStore)
      const cookies = {
        api_token: config.twitchApiToken,
        "auth-token": config.twitchAccessToken,
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
      const sessionGot = got.extend({
        headers: {
          "Accept-Language": "en-US",
          "User-Agent": userAgentRoller.random().toString(),
          "Client-Id": config.twitchWebClientId,
          Authorization: `OAuth ${config.twitchAccessToken}`,
          "Content-Type": "text/plain;charset=UTF-8",
        },
        cookieJar,
      })
      const verifyEmailResponse = await sessionGot.post("https://gql.twitch.tv/gql", {
        body: [
          {
            operationName: "VerifyEmail_CurrentUser",
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "f9e7dcdf7e99c314c82d8f7f725fab5f99d1df3d7359b53c9ae122deec590198",
              },
            },
          },
        ] |> JSON.stringify,
      })
      const twitchId = JSON.parse(verifyEmailResponse.body)[0].data?.currentUser?.id
      if (!twitchId) {
        throw new Error("Not logged in!")
      }
      const channelPanelsResponse = await sessionGot.post("https://gql.twitch.tv/gql", {
        body: [
          {
            operationName: "ChannelPanels",
            variables: {id: twitchId},
            extensions: {
              persistedQuery: {
                version: 1,
                sha256Hash: "236b0ec07489e5172ee1327d114172f27aceca206a1a8053106d60926a7f622e",
              },
            },
          },
        ] |> JSON.stringify,
      })
      const channelPanels = JSON.parse(channelPanelsResponse.body)[0].data.user.panels
      const deleteChannelPanelJobs = channelPanels.filter(({type}) => type === "DEFAULT").map(async ({id}) => {
        await sessionGot.post("https://gql.twitch.tv/gql", {
          body: [
            {
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
          ] |> JSON.stringify,
        })
      })
      await Promise.all(deleteChannelPanelJobs)
      for (const panel of panels) {
        const createChannelPanelResponse = await sessionGot.post("https://gql.twitch.tv/gql", {
          body: [
            {
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
          ] |> JSON.stringify,
        })
        const newPanelId = JSON.parse(createChannelPanelResponse.body)[0].data.createPanel.panel.id
        const uploadPanelImageResponse = await sessionGot.post(`https://api.twitch.tv/v5/users/${twitchId}/upload_panel_image`, {
          body: {
            left: 0,
            top: 0,
            width: panel.imageMeta.width,
            height: panel.imageMeta.height,
          } |> JSON.stringify,
          headers: {
            Accept: "application/vnd.twitchtv.v5+json; charset=UTF-8",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Twitch-Api-Token": config.twitchApiToken,
          },
        })
        const {url: uploadUrl, upload_id: uploadId} = JSON.parse(uploadPanelImageResponse.body)
        await got.put(uploadUrl, {
          body: panel.imageBuffer,
        })
        await sessionGot.post("https://gql.twitch.tv/gql", {
          body: [
            {
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
          ] |> JSON.stringify,
        })
      }
    } catch (error) {
      logger.error("Failed to run: %s", error)
    }
    await browser?.close()
  }

}
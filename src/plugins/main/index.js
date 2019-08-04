import path from "path"

import puppeteer from "puppeteer"
import sharp from "sharp"
import {stringify} from "query-string"
import {isString} from "lodash"
import fsp from "@absolunet/fsp"
import shortid from "shortid"
import {CookieJar} from "tough-cookie"
import {logger, config, got, appFolder} from "src/core"
import UserAgent from "user-agents"
import CookieFileStore from "tough-cookie-file-store"

const userAgentRoller = new UserAgent({deviceCategory: "tablet"})

/**
 * @typedef {Object} Core
 * @prop {import("got").GotInstance} got
 */

export default class {

  /**
   * @param {Core} core
   */
  async ready() {
    try {
      const outputFolder = isString(config.outputFolder) ? config.outputFolder : "dist/panels"
      await fsp.emptyDir(outputFolder)
      const cookieFile = path.join(appFolder, "cookies.json")
      const authFile = path.join(appFolder, "auth.yml")
      const authFileExists = await fsp.pathExists(authFile)
      if (!authFileExists) {
        throw new Error(`${authFile} not found`)
      }
      const {accessToken} = await fsp.readYaml(authFile)
      const cookieStore = new CookieFileStore(cookieFile)
      const cookieJar = new CookieJar(cookieStore)
      const sessionGot = got.extend({
        headers: {
          "Accept-Language": "en-US",
          "User-Agent": userAgentRoller.random().toString(),
          "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
          Authorization: `OAuth ${accessToken}`,
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
      debugger
      // const response = await sessionGot.post("https://passport.twitch.tv/login", {
      //   body: {
      //     username: config.twitchUser,
      //     password: config.twitchPassword,
      //     client_id: "kimne78kx3ncx6brgo4mv6wki5h1ko",
      //   },
      //   json: true,
      // })
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
      const createChannelPanelJobs = config.panels.map(async panel => {
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
        const browser = await puppeteer.launch({
          defaultViewport: {
            width: 320,
            height: 1080,
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
        const page = await browser.newPage()
        const query = {
          ...panel,
          hasLink: Boolean(panel.link),
        }
        await page.goto(`https://panel.jaid.codes?${stringify(query)}`)
        await page.evaluateHandle("document.fonts.ready")
        const buffer = await page.screenshot({
          omitBackground: true,
          fullPage: true,
        })
        const sharpImage = sharp(buffer)
        sharpImage.trim()
        sharpImage.png()
        const imageMeta = await sharpImage.metadata()
        const imageBuffer = await sharpImage.toBuffer()
        await fsp.outputFile(path.join(outputFolder, `${shortid()}.png`), imageBuffer)
        const uploadPanelImageResponse = await sessionGot.post(`https://api.twitch.tv/v5/users/${twitchId}/upload_panel_image`, {
          body: {
            left: 0,
            top: 0,
            width: imageMeta.width,
            height: imageMeta.height,
          } |> JSON.stringify,
          headers: {
            Accept: "application/vnd.twitchtv.v5+json; charset=UTF-8",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Twitch-Api-Token": cookieJar.store.idx["twitch.tv"]["/"].api_token,
          },
        })
        const {url: uploadUrl, upload_id: uploadId} = JSON.parse(uploadPanelImageResponse.body)
        await got.put(uploadUrl, {
          body: imageBuffer,
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
                  linkURL: panel.link || "",
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
        debugger
      })
      await Promise.all(createChannelPanelJobs)
    } catch (error) {
      logger.error("Failed to run: %s", error)
      debugger
    }
    debugger
    process.exit(0)
  }

}
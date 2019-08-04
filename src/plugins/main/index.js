import path from "path"

import puppeteer from "puppeteer"
import sharp from "sharp"
import {stringify} from "query-string"
import {isString} from "lodash"
import fsp from "@absolunet/fsp"
import shortid from "shortid"

export default class {

  /**
   * @param {import("jaid-core").default} core
   */
  async ready({config}) {
    const outputFolder = isString(config.outputFolder) ? config.outputFolder : "dist/panels"
    await fsp.emptyDir(outputFolder)
    const renderPanelJobs = config.panels.map(async panel => {
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
      const query = {...panel}
      await page.goto(`https://panel.jaid.codes?${stringify(query)}`)
      await page.evaluateHandle("document.fonts.ready")
      const buffer = await page.screenshot({
        omitBackground: true,
        fullPage: true,
      })
      const sharpImage = sharp(buffer)
      sharpImage.trim()
      await sharpImage.toFile(path.join(outputFolder, `${shortid()}.png`))
    })
    await Promise.all(renderPanelJobs)
    process.exit(0)
  }

}
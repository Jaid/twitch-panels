import puppeteer from "puppeteer"
import sharp from "sharp"

export default class {

  /**
   * @param {import("jaid-core").default} core
   */
  async ready(core) {
    core.koa.use(async context => {
      context.body = require("!raw-loader!twitch-panel-html/index.html").default
    })
    const browser = await puppeteer.launch({
      defaultViewport: {
        width: 1920,
        height: 1080,
        isLandscape: true,
      },
    })
    const page = await browser.newPage()
    await page.goto(`http://localhost:${core.config.insecurePort}?mode=a`)
    const buffer = await page.screenshot({
      omitBackground: true,
      fullPage: true,
    })
    const sharpImage = sharp(buffer)
    sharpImage.trim()
    await sharpImage.toFile("dist/panel.png")
  }

}
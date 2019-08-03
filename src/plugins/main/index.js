import puppeteer from "puppeteer"
import sharp from "sharp"

export default class {

  /**
   * @param {import("jaid-core").default} core
   */
  async ready() {
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
    await page.goto("https://panel.jaid.codes?mode=a")
    await page.evaluateHandle("document.fonts.ready")
    const buffer = await page.screenshot({
      omitBackground: true,
      fullPage: true,
    })
    const sharpImage = sharp(buffer)
    sharpImage.trim()
    await sharpImage.toFile("dist/panel.png")
  }

}
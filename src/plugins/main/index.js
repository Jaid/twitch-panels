import puppeteer from "puppeteer"

export default class {

  /**
   * @param {import("jaid-core").default} core
   */
  async ready(core) {
    core.koa.use(async context => {
      context.body = require(`!raw-loader!${process.env.webappPath}/index.html`)
    })
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(`http://localhost:${core.config.insecurePort}`)
    await page.screenshot({path: "example.png"})
  }

}
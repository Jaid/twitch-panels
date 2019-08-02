import got from "got"

/**
 * @type {import("got").GotExtend}
 */
export default got.extend({
  baseUrl: "https://amazon.de",
})
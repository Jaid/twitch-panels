/**
 * @function
 * @param { import("cheerio/lib/static") } cheerio
 * @param { import("cheerio/lib/cheerio") } nodeList
 * @param {string} text
 * @returns {*[]}
 */
export const filterByText = (cheerio, nodeList, text) => {
  return nodeList.filter(function () {
    const node = cheerio(this)
    const content = node.text()
    return content.includes(text)
  })
}

export const findByText = (cheerio, nodeList, text) => {
  return filterByText()
}
import Sequelize from "sequelize"
import {logger, got} from "src/core"
import UserAgent from "user-agents"

const userAgentRoller = new UserAgent({deviceCategory: "tablet"})

const amazonGot = got.extend({
  baseUrl: "https://amazon.de",
})

class ProductFetch extends Sequelize.Model {

  static associate(models) {
    ProductFetch.belongsTo(models.ProductCheck)
  }

  /**
   * @param {string} asin
   * @return {Promise<ProductFetch>}
   */
  static async make(asin) {
    try {
      logger.info("Request %s", asin)
      const userAgent = userAgentRoller.random().toString()
      const response = await amazonGot(`dp/${asin}`, {
        headers: {
          "User-Agent": userAgent,
        },
      })
      const productFetch = await ProductFetch.create({
        url: response.requestUrl,
        userAgent: response.request.gotOptions.headers["user-agent"],
        body: response.body,
        httpVersion: response.httpVersion,
        method: response.request.gotOptions.method,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
      })
      return productFetch
    } catch (error) {
      logger.error("Could not create ProductFetch: %s", error)
      throw error
    }
  }

}

export const schema = {
  url: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  userAgent: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  body: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  httpVersion: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  method: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  statusCode: {
    type: Sequelize.SMALLINT,
    allowNull: false,
  },
  statusMessage: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}

export default ProductFetch
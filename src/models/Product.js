import Sequelize from "sequelize"
import ProductCheck from "src/models/ProductCheck"
import {logger} from "src/core"

class Product extends Sequelize.Model {

  static associate(models) {
    Product.hasMany(models.ProductCheck, {
      foreignKey: {
        allowNull: false,
      },
    })
  }

  static async start() {
    const [product] = await Product.findOrCreate({
      where: {
        asin: "B071KGS72Q",
      },
      defaults: {
        title: "SanDisk Ultra 2D SSD 2 TB",
      },
    })
    await product.check()
  }

  async check() {
    const check = await ProductCheck.make(this)
    debugger
  }

}

export const schema = {
  asin: {
    type: Sequelize.STRING(10), // See https://www.nchannel.com/blog/amazon-asin-what-is-an-asin-number
    allowNull: false,
    unique: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}

export default Product
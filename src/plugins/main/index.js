import Product from "src/models/Product"

export default class {

  /**
   * @param {import("jaid-core").default} core
   */
  async init(core) {
  }

  addModels(addModel) {
    const modelsRequire = require.context("../../models/", true, /.js$/)
    for (const value of modelsRequire.keys()) {
      const modelName = value.match(/\.\/(?<key>[\da-z]+)\./i).groups.key
      addModel(modelName, modelsRequire(value))
    }
  }

}
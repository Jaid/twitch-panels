import path from "path"

import webpack from "webpack"
import configure from "webpack-config-jaid"

const webappPath = path.join(__dirname, "dist", "web", process.env.NODE_ENV || "development")

const webConfig = configure({
  type: "webapp",
  sourceFolder: path.join(__dirname, "src", "web"),
  title: "TwitchPanels App",
  inlineSource: true,
  outDir: webappPath,
  sitemap: false,
  clean: true,
})

const coreConfig = configure({
  publishimo: {fetchGithub: true},
  extra: {
    plugins: [
      new webpack.DefinePlugin({
        "process.env.webappPath": webappPath |> JSON.stringify,
      }),
    ],
  },
})

module.exports = [webConfig, coreConfig]
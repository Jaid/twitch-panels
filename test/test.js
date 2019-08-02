import path from "path"

import delay from "delay"
import ms from "ms.macro"

it("should run", async () => {
  (process.env.MAIN ? path.resolve(process.env.MAIN) : path.join(__dirname, "..", "src")) |> require
  await delay(ms`30 seconds`)
  process.exit(0)
}, ms`40 seconds`)
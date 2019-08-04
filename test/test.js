import path from "path"

import ms from "ms.macro"

it("should run", async () => {
  (process.env.MAIN ? path.resolve(process.env.MAIN) : path.join(__dirname, "..", "src")) |> require
}, ms`30 seconds`)
import ensureArray from "ensure-array"
import {orderBy} from "lodash"

/**
 * @callback CommandMapper
 * @param {import("../core").Command} command
 * @return {import("../core").Panel}
 */

/**
 * @param {import("../core").Command[]} commands
 * @return {import("../core").Panel[]}
 */
export default commands => {
  const commandsSorted = orderBy(commands, [command => command.permission, command => command.command], ["desc", "asc"])
  return commandsSorted.map(/** @type {CommandMapper} */ command => {
    const colors = {
      mod: "#E40000",
      subOrVip: "#00D8EB",
    }
    let content = ""
    if (command.permission === "mod") {
      content += "{iconcenter:lock/Nur für Moderatoren}"
    }
    if (command.permission === "subOrVip") {
      content += "{iconcenter:star/Nur für Subscriber, VIPs und Moderatoren}"
    }
    content += command.description
    if (command.example) {
      content += `{br:10}{colored:Beispiel:}{br:4}{chat:${ensureArray(command.example).join("\n")}}`
    }
    return {
      content,
      title: `!${command.command}`,
      icon: "comment",
      themeColor: colors[command.permission] || "#0072AE",
      ...command.panel || {},
    }
  })
}
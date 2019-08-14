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
export const commandsToPanels = commands => {
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
      content += "{iconcenter:lock/Nur für Subscriber, VIPs und Mods}"
    }
    content += command.description
    if (command.example) {
      content += `{br:20}{colored:Beispiel:}{br:10}{chat:${ensureArray(command.example).join("\n")}}`
    }
    return {
      content,
      title: `!${command.command}`,
      icon: "comment",
      titleUppercase: "",
      themeColor: colors[command.permission] || "#0072AE",
      ...command.panel || {},
    }
  })
}

/**
 * @callback AnswerMapper
 * @param {import("../core").Answer} answer
 * @return {import("../core").Panel}
 */

export const answersToPanels = answers => answers.map(/** @type {AnswerMapper} */ ({question, answer, panel}) => {
  return {
    title: question,
    content: answer,
    icon: "question-circle-o",
    titleSize: 20,
    themeColor: "#287d55",
    titleUppercase: "",
    ...panel || {},
  }
})
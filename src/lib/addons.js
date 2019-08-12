/**
 * @callback CommandMapper
 * @param {import("../core").Command} command
 * @return {import("../core").Panel}
 */

export const commandsToPanels = commands => commands.map(/** @type {CommandMapper} */ command => {
  const description = command.description || "Description"
  return {
    title: `${command.command}`,
    icon: "comment",
    content: `${description}${command.example ? `\n{bold:Beispiel}:{chat:${command.example}}` : ""}`,
    titleUppercase: "",
    themeColor: "#4d7d28",
    ...command.panel || {},
  }
})

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
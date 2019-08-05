export const commandsToPanels = commands => commands.map(command => {
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

export const answersToPanels = answers => answers.map(({question, answer, panel}) => {
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
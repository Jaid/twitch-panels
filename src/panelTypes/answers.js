/**
 * @callback AnswerMapper
 * @param {import("../core").Answer} answer
 * @param {number} index
 * @return {import("../core").Panel}
 */

export default answers => answers.map(/** @type {AnswerMapper} */ ({question, answer, panel}, index) => {
  return {
    title: question,
    content: answer,
    icon: "question-circle-o",
    titleFontSize: 20,
    themeColor: `hsl(${130 + index * 4}, 100%, 45%)`,
    ...panel || {},
  }
})
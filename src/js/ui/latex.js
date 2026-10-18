import { math } from '../calc/calcManager'
import { hasAnswer, isLiteralAssignment } from './copyFormat'

const REGEX_COMMENT_LINE = /^(#|\/\/)/
const REGEX_TRAILING_COMMENT = /^(.*?)\s*(?:\/\/|#)(.*)$/
const REGEX_FUNCTION_DEFINITION = /^([\p{L}_][\p{L}\p{M}\w]*\s*\(\s*[\p{L}_][\p{L}\p{M}\w, ]*\))\s*=(?!=)\s*(.+)$/u
const REGEX_ASSIGNMENT = /^([\p{L}_][\p{L}\p{M}\w]*)\s*=(?!=)\s*(.+)$/u
const REGEX_NUMERIC = /^[-+]?[\d.,\s%eE]+$/

const TEXT_ESCAPES = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  '&': '\\&',
  _: '\\_',
  '^': '\\^{}',
  '~': '\\~{}'
}

/**
 * Escape text for use inside \text{...}.
 * @param {string} text The plain text.
 * @returns {string} The LaTeX safe text.
 */
function escapeText(text) {
  return text.replace(/[\\{}%$#&_^~]/g, (char) => TEXT_ESCAPES[char])
}

/**
 * Convert a Math.js compatible expression to LaTeX, or fall back to escaped text when it can not be parsed.
 * @param {string} expression The expression.
 * @returns {string} The LaTeX.
 */
function expressionToTex(expression) {
  // Keep percentages as typed (3\%) instead of letting Math.js turn them into fractions.
  const percents = []
  const masked = expression.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, number) => `PCT${percents.push(number) - 1}X`)

  try {
    return math
      .parse(masked)
      .toTex({ parenthesis: 'keep', implicit: 'hide' })
      .replace(/\\mathrm\{PCT(\d+)X\}|\s?PCT(\d+)X/g, (match, a, b) => `${percents[a ?? b]}\\%`)
  } catch {
    return `\\text{${escapeText(expression)}}`
  }
}

/**
 * Convert an answer to LaTeX. Percent signs are escaped, e.g. 3% becomes 3\%.
 * @param {string} answer The answer text.
 * @returns {string} The LaTeX.
 */
function answerToTex(answer) {
  if (REGEX_NUMERIC.test(answer)) {
    return answer.replace(/%/g, '\\%').replace(/(?<=\d),(?=\d{3}\b)/g, '{,}')
  }

  return expressionToTex(answer)
}

/**
 * Convert one input line and its answer to a row of an aligned LaTeX block.
 * @param {string} line The trimmed input line.
 * @param {string} answer The answer text.
 * @returns {string} The row.
 */
function lineToRow(line, answer) {
  if (REGEX_COMMENT_LINE.test(line)) return `& \\text{${escapeText(line.replace(/^(#|\/\/)\s*/, ''))}}`

  const comment = line.match(REGEX_TRAILING_COMMENT)
  const code = comment ? comment[1] : line
  const note = comment ? `\\quad \\text{${escapeText(comment[2].trim())}}` : ''
  const showAnswer = hasAnswer(answer) && !isLiteralAssignment(code, answer)
  const result = showAnswer ? ` = ${answerToTex(answer)}` : ''
  const definition = code.match(REGEX_FUNCTION_DEFINITION)
  const assignment = code.match(REGEX_ASSIGNMENT)

  if (definition)
    return `${expressionToTex(definition[1])} &= ${expressionToTex(definition[2])}${result} ${note}`.trim()
  if (assignment)
    return `${expressionToTex(assignment[1])} &= ${expressionToTex(assignment[2])}${result} ${note}`.trim()

  return `${expressionToTex(code)} &${result.replace(' =', '=')} ${note}`.trim()
}

/**
 * Convert the page to LaTeX for Obsidian: one aligned $$ block per group of lines separated by blank lines.
 * @param {string[]} lines The input lines.
 * @param {string[]} answers The answers, by line index.
 * @returns {string} The LaTeX.
 */
export function pageToLatex(lines, answers) {
  const blocks = []
  let rows = []

  const flush = () => {
    if (rows.length) {
      blocks.push(`$$\n\\begin{aligned}\n${rows.join(' \\\\\n')}\n\\end{aligned}\n$$`)
    }

    rows = []
  }

  lines.forEach((line, index) => {
    const text = line.trim()

    if (!text) return flush()

    rows.push(lineToRow(text, answers[index] ?? ''))
  })

  flush()

  return blocks.join('\n\n')
}

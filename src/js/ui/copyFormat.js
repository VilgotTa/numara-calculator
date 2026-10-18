const REGEX_COMMENT = /^(#|\/\/)/
const REGEX_ASSIGNMENT = /^[A-Za-z_]\w*\s*=\s*([^=].*)$/
const REGEX_NUMBER = /^[-+]?(\d[\d_,]*\.?\d*|\.\d+)(e[-+]?\d+)?$/i

/**
 * Check if a line is a plain assignment of a literal, where the answer would only repeat the right-hand side.
 * @param {string} text The trimmed line text.
 * @param {string} answer The answer of the line.
 * @returns {boolean} True if the answer adds nothing.
 */
export function isLiteralAssignment(text, answer) {
  const rhs = text.match(REGEX_ASSIGNMENT)?.[1].trim()

  return rhs !== undefined && (REGEX_NUMBER.test(rhs) || rhs === answer)
}

/**
 * Check if an output cell holds a real answer, and not an error, timeout or empty cell.
 * @param {string} answer The output text.
 * @returns {boolean} True if there is an answer.
 */
export function hasAnswer(answer) {
  return answer !== '' && answer !== 'Error' && answer !== 'Timeout' && answer !== 'Plot'
}

/**
 * Format a line for copying: "line=answer", without the answer for comments and plain literal assignments.
 * @param {string} text The trimmed line text.
 * @param {string} answer The answer of the line.
 * @returns {string} The text to copy.
 */
export function formatCopiedLine(text, answer = '') {
  if (!text || REGEX_COMMENT.test(text) || !hasAnswer(answer) || isLiteralAssignment(text, answer)) return text

  return `${text}=${answer}`
}

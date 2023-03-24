/**
 * 将单词首字母变成大写
 */
export function capitalizeFirstLetter(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * 将单词首字母变成小写
 */
export function toLowerCaseFirstLetter(word: string) {
  if (typeof word !== 'string') {
    throw new TypeError('Expected a string')
  }
  if (word.length === 0) {
    return ''
  }
  return word.charAt(0).toLowerCase() + word.slice(1)
}

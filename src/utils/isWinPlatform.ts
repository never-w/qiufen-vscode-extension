import os from 'os'

/**
 * window路径符号--> '\\'
 *
 * mac路径符号--> '/'
 */
const isWinPlatform = () => os.platform().includes('win32')

export default isWinPlatform

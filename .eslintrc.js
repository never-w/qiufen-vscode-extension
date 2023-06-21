//@ts-check
/** @typedef {import('eslint').Linter.Config} EslintConfig **/

/** @type EslintConfig */
module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // ecmaFeatures: {
    //   jsx: true,
    // },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['import', '@typescript-eslint', 'react-hooks'],
  rules: {
    'import/no-unresolved': [2, { ignore: ['^@/', 'dist', 'vscode'] }],
    'import/first': 1,
    'import/order': [
      1,
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        pathGroups: [
          {
            pattern: 'react/*',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'external',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: [],
        // newlines-between 不同组之间是否进行换行
        'newlines-between': 'always',
        // alphabetize 根据字母顺序对每个组内的顺序进行排序
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'react-hooks/rules-of-hooks': 'error', // 检查 Hook 的规则
    'react-hooks/exhaustive-deps': 'warn', // 检查 effect 的依赖
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/no-empty-interface': 0,
    'import/default': 0,
    // 数据转换 !!var +var
    'no-implicit-coercion': 0,
    '@typescript-eslint/consistent-type-imports': 1,
    'no-undef': 0,
    'no-console': 1,
    /**
     * 禁止变量名与上层作用域内的已定义的变量重复
     */
    '@typescript-eslint/no-shadow': 2,
    '@typescript-eslint/ban-ts-comment': 0,
  },
}

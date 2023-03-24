import Mock from 'mockjs'
const { Random } = Mock

export const defaultQiufenConfig = {
  playground: {
    headers: {
      Authorization: '',
      appversioncode: '33',
      'app-version': '33',
      platform: 'ios',
    },
  },
  mock: {
    enable: true,
    mockDirectiveDefaultEnableValue: true,
    scalarMap: {
      Int: () => Random.integer(0, 100),
      String: () => Random.ctitle(2, 4),
      ID: () => Random.id(),
      Boolean: () => Random.boolean(),
      BigDecimal: () => Random.integer(0, 1000000),
      Float: () => Random.float(0, 100),
      Date: () => Random.date(),
      DateTime: () => Random.datetime(),
      Long: () => Random.integer(0, 10000),
      NumberOrBoolOrStringOrNull: () => null,
      NumberOrString: () => null,
    },
    resolvers: {
      Query: {},
    },
  },
}

// const dts = require("rollup-plugin-dts")
const cjs = require("@rollup/plugin-commonjs")
const ts = require("rollup-plugin-typescript2")
const { nodeResolve } = require("@rollup/plugin-node-resolve")
const pkg = require("./package.json")

const input = "./src/index.ts"

module.exports = [
  {
    input,
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
    ],
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
    plugins: [
      cjs(),
      nodeResolve(),
      ts({
        tsconfigOverride: {
          exclude: ["**/__tests__/**"],
        },
      }),
    ],
  },
]

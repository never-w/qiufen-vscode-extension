import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
  // 配置路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'modules',
    outDir: '../dist-page-view',
    assetsDir: 'assets',
    minify: 'terser', // 混淆器
  },
  // server: {
  //   proxy: {
  //     '/operations': {
  //       target: 'http://localhost:9400',
  //       changeOrigin: true,
  //       // rewrite: (path) => path.replace(/^\/api/, ''),
  //     },
  //   },
  // },
  css: {
    // css预处理器
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        charset: false,
        additionalData: '@import "./src/styles/variables.less";',
      },
    },
  },
})

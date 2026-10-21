import path from 'node:path';
import { defineConfig } from 'vite';

const pkgRoot = path.resolve(import.meta.dirname) + path.sep;

/**
 * build-plugin-lce 是 Node 端 CJS 构建工具（module.exports = fn + 全量 require()）。
 * 它只在 build-scripts 环境里被 require，没有 ESM 消费方，且源码/依赖都是 CJS，
 * 因此这里只产出 CJS（index.cjs），不做 ESM。
 *
 * external 判定同其它包：未解析的裸导入一律 external（依赖交给 Node require 解析），
 * 已解析的按“是否在本包目录内”判断，包内源码打进产物。
 */
const external = (id: string, _parentId: string | undefined, isResolved: boolean): boolean => {
  if (isResolved) {
    return !path.normalize(id).startsWith(path.normalize(pkgRoot));
  }
  return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('virtual:');
};

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external,
    },
    // Node 工具，跑在服务端，不需要浏览器 target 的 polyfill
    target: 'node20',
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});

import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const pkgRoot = path.resolve(import.meta.dirname) + path.sep;

/**
 * 库模式 external 判定。见 lowcode-plugin-inject/vite.config.ts 的同款注释：
 * CONVENTIONS §3.1 的字符串前缀判定在 Windows 上会把已解析的兄弟模块（绝对盘符路径）
 * 误判为 external，导致产物里留下指向不存在文件的导入。这里按“是否在本包目录内”判断。
 */
const external = (id: string, _parentId: string | undefined, isResolved: boolean): boolean => {
  if (isResolved) {
    return !path.normalize(id).startsWith(path.normalize(pkgRoot));
  }
  return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('virtual:');
};

export default defineConfig({
  plugins: [
    react(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  // public/ 下是 demo 用的 index.html / preview.html，不属于库产物，禁止拷进 dist
  publicDir: false,
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
      cssFileName: 'style',
    },
    rollupOptions: {
      external,
      output: {
        exports: 'named',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});

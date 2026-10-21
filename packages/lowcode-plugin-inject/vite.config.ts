import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const pkgRoot = path.resolve(import.meta.dirname) + path.sep;

/**
 * 库模式 external 判定。
 *
 * 注意：CONVENTIONS §3.1 里的
 * `external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('virtual:')`
 * 在 Windows 上有 bug —— rolldown 对**已解析**的兄弟模块回传的是绝对盘符路径
 * （`D:/xxx/src/utils.tsx`），既不以 `.` 也不以 `/` 开头，于是被误判为 external，
 * 产物里会留下 `from "./utils.tsx"` 这种指向不存在文件的导入。
 *
 * 这里改成：未解析的裸导入一律 external（依赖 / peer / workspace 包，交给消费方解析），
 * 已解析的按“是否在本包目录内”判断 —— 包内的源码要打进来，包外的才是 external。
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
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
      // 产出 dist/style.css（默认会用包名命名，这里固定成 style.css 方便消费方引用）
      cssFileName: 'style',
    },
    rollupOptions: {
      external,
      output: {
        // 入口同时有 default 和 named 导出，显式声明避免 [MIXED_EXPORTS] 警告
        exports: 'named',
      },
    },
    // pane.scss 需要单独产出 style.css，供消费方显式引入
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});

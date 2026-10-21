import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

const pkgRoot = path.resolve(import.meta.dirname) + path.sep;

/**
 * 库模式 external 判定（同 lowcode-plugin-inject 说明）：
 * 未解析的裸导入一律 external；已解析的按“是否在本包目录内”判断，包内源码要打进来。
 * CONVENTIONS §3.1 的字符串前缀判定在 Windows 上会把绝对盘符路径的兄弟模块误判为 external。
 */
const external = (id: string, _parentId: string | undefined, isResolved: boolean): boolean => {
  if (isResolved) {
    return !path.normalize(id).startsWith(path.normalize(pkgRoot));
  }
  return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('virtual:');
};

/**
 * 这是个 CLI（package.json 里有 bin）。Vite 库模式默认会吃掉入口顶部的
 * `#!/usr/bin/env node`，导致 `npx create-element` 直接被 node 当普通脚本执行而没有 shebang。
 * 这里在产物最前面补回 shebang，并保证 dist/index.mjs 有可执行入口。
 */
function cliShebang(): Plugin {
  return {
    name: 'create-element:shebang',
    renderChunk(code, chunk) {
      if (chunk.facadeModuleId && chunk.facadeModuleId.replace(/\\/g, '/').endsWith('src/index.ts')) {
        return { code: `#!/usr/bin/env node\n${code}`, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    cliShebang(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      // create-element 是纯 CLI，且依赖（chalk@6 / inquirer@14 / yargs@18 / glob@13 / ejs@7）
      // 全是 ESM-only，无法产出可用的 .cjs（require ESM 会直接抛错），因此只出 ESM。
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      external,
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});

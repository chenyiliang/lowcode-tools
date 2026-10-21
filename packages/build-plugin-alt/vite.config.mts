import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkgRoot = path.resolve(import.meta.dirname);
const srcDir = path.join(pkgRoot, 'src');
const outDir = path.join(pkgRoot, 'dist');

/** 需要原样拷贝进 dist 的静态资源（运行时按 __dirname 相对路径读取，不参与打包） */
const ASSET_EXT = new Set(['.scss', '.css', '.html', '.json', '.ejs']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * 把 src 下所有 .ts/.tsx（排除 .d.ts）都作为入口，逐个转译成 CJS，
 * 配合 preserveModules 在 dist 下还原 src 的目录结构 —— 等价于旧的 `tsc + copyfiles`。
 *
 * 为什么要保持逐文件结构（而不是单文件打包）：本插件在运行时用 __dirname 拼内部路径，例如
 *   path.join(__dirname, './entry/plugin.js')、require.resolve('./babelPluginMeta')、
 *   require.resolve('./public/index.html')。
 * 单文件打包会打乱这些相对布局，导致 start/build 时找不到 webpack 入口。
 * entry/*.ts、builtIn/*.tsx 本身是给消费方 webpack 用的入口模板（会 import
 * __lowcode-plugin-demo__ 这类只在消费方 webpack 里定义的别名），所以它们只做转译、不解析。
 */
const entries: Record<string, string> = {};
for (const file of walk(srcDir)) {
  if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) continue;
  const name = path.relative(srcDir, file).replace(/\.(ts|tsx)$/, '');
  entries[name] = file;
}

const external = (id: string): boolean => {
  if (id.startsWith('.') || id.startsWith('/') || id.startsWith('virtual:')) return false;
  // 资源导入（.scss/.json 等）交给消费方 webpack；其余裸导入（含 __lowcode-*-demo__ 别名）external
  return true;
};

function copyAssets(): Plugin {
  return {
    name: 'build-plugin-alt:copy-assets',
    closeBundle() {
      for (const file of walk(srcDir)) {
        if (!ASSET_EXT.has(path.extname(file))) continue;
        const rel = path.relative(srcDir, file);
        const dest = path.join(outDir, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    lib: {
      entry: entries,
      formats: ['cjs'],
    },
    rollupOptions: {
      external,
      output: {
        preserveModules: true,
        preserveModulesRoot: srcDir,
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
    target: 'node20',
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});

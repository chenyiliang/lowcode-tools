import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const pkgRoot = path.resolve(import.meta.dirname);
const srcDir = path.join(pkgRoot, 'src');
const outDir = path.join(pkgRoot, 'dist');

/** 需要原样拷贝（不参与打包/转译）的目录：handlebars 文本模板 + HTML 模板 */
const RAW_COPY_DIRS = ['templates', 'public'];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const isRawDir = (rel: string) => RAW_COPY_DIRS.some((d) => rel === d || rel.startsWith(d + path.sep));

/**
 * build-plugin-lowcode 是 Node 端 CJS 构建插件，运行时会按 __dirname 读取内部文件：
 *   require.resolve('./public/index.html')、path.join(__dirname, '../templates/<name>')。
 *
 * 关键点：src/templates/* 是 handlebars **文本模板**（里面的 .js/.jsx 也含 `{{{ }}}` 占位符，
 * 不是合法 JS），只能原样拷贝，绝不能让 rolldown 去 parse/transform。src/public/*.html 同理。
 *
 * 因此：只对逻辑文件（templates/、public/ 之外的 .js）做多入口 preserveModules 转译，
 * 在 dist 下还原目录结构；templates/、public/ 整目录原样拷贝，保证上面的相对路径仍然成立。
 */
const entries: Record<string, string> = {};
for (const file of walk(srcDir)) {
  const rel = path.relative(srcDir, file);
  if (isRawDir(rel)) continue; // 模板/HTML 不进打包
  if (!/\.js$/.test(file)) continue;
  const name = rel.replace(/\.js$/, '');
  entries[name] = file;
}

const external = (id: string): boolean => {
  if (id.startsWith('.') || id.startsWith('/') || id.startsWith('virtual:')) return false;
  return true; // 所有裸导入交给消费方 Node require 解析
};

function copyRaw(): Plugin {
  return {
    name: 'build-plugin-lowcode:copy-raw',
    closeBundle() {
      for (const dir of RAW_COPY_DIRS) {
        for (const file of walk(path.join(srcDir, dir))) {
          const rel = path.relative(srcDir, file);
          const dest = path.join(outDir, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(file, dest);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [copyRaw()],
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

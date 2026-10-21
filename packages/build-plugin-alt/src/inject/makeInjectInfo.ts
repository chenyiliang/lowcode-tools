import * as fs from 'fs-extra';
import { getFilePath } from './utils';

/** 一条注入资源的缓存记录，写入 ~/.altrc/inject.json 供 inject server 读取 */
interface InjectCacheEntry {
  packageName: string;
  type: string;
  library?: string;
  subType?: string;
  url: string;
}

/** ~/.altrc/inject.json 的结构：`${port}-utils` / `${port}-view` / `${port}-meta` -> 记录 */
type InjectCache = Record<string, InjectCacheEntry>;

interface MakeInjectInfoOptions {
  // build-scripts 的 pkg 是宽松的 Json 类型，这里只读取 name 字段
  pkg: { name?: string } & Record<string, unknown>;
  host: string;
  port?: string | number;
  type: string;
  library?: string;
}

export default ({ pkg, host, port, type, library }: MakeInjectInfoOptions) => {
  const pkgName = pkg?.name ?? '';
  const cacheFilePath = getFilePath();
  fs.ensureFileSync(cacheFilePath);
  let cache: InjectCache = {};
  try {
    cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8')) as InjectCache;
  } catch (e) { }
  if (type !== 'component') {
    cache[`${port}-utils`] = {
      packageName: pkgName,
      type: type === 'plugin' ? 'designerPlugin' : 'setter',
      library,
      subType: '',
      url: `http://${host}:${port}/js/utils.js?name=${pkgName}`,
    };
  } else {
    cache[`${port}-view`] = {
      packageName: pkgName,
      library,
      type: 'view',
      url: `http://${host}:${port}/view.js?name=${pkgName}`,
    };
    cache[`${port}-meta`] = {
      packageName: pkgName,
      library,
      type: 'meta',
      url: `http://${host}:${port}/meta.js?name=${pkgName}`,
    }
  }

  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, ' '));
}

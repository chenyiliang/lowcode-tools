import queryString from 'query-string';
import fetchJsonp from 'fetch-jsonp';
import React from 'react';
import Case from 'case';
import { Notification } from '@alifd/next';
import { buildComponents } from '@alilc/lowcode-utils';
import type { IPublicTypeNpmInfo, IPublicTypeComponentSchema } from '@alilc/lowcode-types';

/** inject 资源的类型 -> 该类型对应的资源 type 列表 */
const typeMap: Record<string, string[]> = {
  vc: ['prototype', 'view'],
  vs: ['setter'],
  vp: ['plugin'],
  ve: ['pane'],
  vu: ['utils'],
  plugin: ['designerPlugin'],
  component: ['meta', 'view'],
};

const queryFlag = '__injectFrom'; // 不推荐
const injectTypeFlag = '__injectType'; // 不推荐
const injectEnvFlag = '__injectEnv'; // 不推荐
const debugFlag = 'debug'; // 推荐
const arrayFlag = '__components';
const jsonpFlag = '__injectComponent';
const prototypeKeyFlag = '__prototype';
const injectDeviceFlag = '__device';

const injectWindow = window as unknown as InjectWindow;

injectWindow[arrayFlag] = [];
injectWindow[jsonpFlag] = function addComponents(component: InjectUrlItem) {
  injectWindow[arrayFlag]!.push(component);
};

const DEFAULT_INJECT_SERVER_HOST = '127.0.0.1';
const DEFAULT_INJECT_SERVER_PORT = 8899;

let injectServerHost = DEFAULT_INJECT_SERVER_HOST;

const searchParams = new URLSearchParams(window.location.search);
// 是否需要开启 inject 逻辑
export const needInject = searchParams.get(queryFlag) // 历史兼容
  || searchParams.get(injectTypeFlag) === 'auto' // 历史兼容
  || searchParams.has(debugFlag)
  || Boolean(injectWindow.injectConfig);

type InjectUrl = string | InjectUrlItem;

let urlCache: InjectUrl[] | null = null;

export function setInjectServerHost(finalInjectServerHost: string): void {
  injectServerHost = finalInjectServerHost || DEFAULT_INJECT_SERVER_HOST;
  console.log('inject server host', injectServerHost);
}

export interface InjectOptions {
  filter?: (url: string) => boolean;
}

interface InjectInfoResponse {
  success?: boolean;
  content?: InjectUrlItem[];
}

interface ComponentUrlItem {
  packageName: string;
  library?: string;
  [type: string]: string | undefined;
}

function parseQuery(): Record<string, string | string[] | null> {
  return queryString.parse(window.location.search) as Record<string, string | string[] | null>;
}

/**
 * 获取 inject 资源的 url。
 * @param resourceType 资源类型，见 typeMap；为空表示不过滤类型
 * @param type 'url' 表示只返回 url 字符串数组，'item' 表示返回完整的资源条目
 */
function getInjectUrls(
  resourceType?: string,
  type: 'url' | 'item' = 'url',
  injectOptions?: InjectOptions,
): Promise<InjectUrl[]> {
  const filter = (_urls: InjectUrl[]): InjectUrl[] => {
    let urls = _urls;
    if (injectOptions?.filter) {
      const { filter: predicate } = injectOptions;
      urls = urls.filter((item) => predicate(typeof item === 'string' ? item : String(item.url ?? '')));
    }
    if (!resourceType) {
      return type === 'url' ? urls.map((item) => (typeof item === 'string' ? item : item.url!)) : urls;
    }
    const allowedTypes = typeMap[resourceType] ?? [];
    const filteredUrls = urls.filter((item) => {
      if (typeof item === 'string') {
        return item.indexOf(`name=@ali/${resourceType}-`) >= 0;
      }
      if (item.type) {
        return allowedTypes.indexOf(item.type) >= 0;
      }
      return false;
    });
    return type === 'url' ? filteredUrls.map((item) => (typeof item === 'string' ? item : item.url!)) : filteredUrls;
  };

  return new Promise<InjectUrl[]>((resolve) => {
    if (urlCache) {
      resolve(filter(urlCache));
      return;
    }

    const urlParams = parseQuery();
    const rawUrls = urlParams[queryFlag] ?? [];
    let urls: InjectUrl[] = Array.isArray(rawUrls) ? rawUrls : [rawUrls as string];

    const { type: injectConfigType, injects } = injectWindow.injectConfig ?? {};
    const isAuto = injectConfigType === 'auto'
      || urlParams[injectTypeFlag] === 'auto'
      || urlParams[debugFlag] !== undefined;

    if (isAuto) {
      fetchJsonp(`http://${injectServerHost}:${DEFAULT_INJECT_SERVER_PORT}/apis/injectInfo`)
        .then((res) => res.json() as Promise<InjectInfoResponse>)
        .then((data) => {
          urls = envFilter(data.content);
          urlCache = urls;
          resolve(filter(urlCache));
        })
        .catch((err) => {
          urlCache = [];
          resolve([]);
          console.error(err);
        });
    } else if (injectConfigType === 'custom' && injects) {
      urls = urls.concat(injects);
      urlCache = urls;
      resolve(filter(urlCache));
    } else {
      urlCache = urls;
      resolve(filter(urlCache));
    }
  });
}

type ScriptLoadCallback = (error?: Error) => void;

function loadScript(url: string, callback?: ScriptLoadCallback): void {
  const src = ((_url: string) => {
    const isInFileProtocol = _url.indexOf('//') === 0 && window.location.protocol === 'file:';
    return isInFileProtocol ? `//${_url}` : _url;
  })(url);
  const scriptElement = document.createElement('script');
  scriptElement.crossOrigin = 'anonymous';
  scriptElement.src = src;
  scriptElement.async = true;
  if (callback) {
    scriptElement.onload = () => callback();
    scriptElement.onerror = () => callback(new Error(`Inject ${url} failed`));
  }
  document.body.insertBefore(scriptElement, document.body.firstChild);
}

function promiseLoadScript(url: string): Promise<unknown> {
  return new Promise((rs, rj) => {
    loadScript(url, (e) => (e ? rj(e) : rs({})));
  }).then(
    () => {
      console.info(`%c Injected ${url}`, 'font-weight:bold; font-size: 20px; color: orange;');
    },
    (e) => {
      console.error(e);
    },
  );
}

function loadComponentFromSources(sources: string[]): Promise<unknown[]> {
  return Promise.all(sources.map((url) => promiseLoadScript(url)));
}

/** 获取 inject 的资源，格式 [{name, module, pluginType}] */
export async function getInjectedResource(type?: string, injectOptions?: InjectOptions): Promise<InjectUrlItem[]> {
  const urls = await getInjectUrls(type, undefined, injectOptions) as string[];
  await loadComponentFromSources(urls);
  const allowedTypes = type ? typeMap[type] : undefined;
  return (injectWindow[arrayFlag] ?? [])
    .filter((item) => {
      const _item = item.default ?? item;
      if (!type) {
        return true;
      }
      if (_item.type && allowedTypes && allowedTypes.indexOf(_item.type) < 0) {
        return false;
      }
      if (!_item.type && _item.name && _item.name.indexOf(`@ali/${type}-`) < 0) {
        return false;
      }
      return true;
    })
    .map((item) => {
      const _item = item.default ?? item;
      _item.module = getModule(_item.module);
      return _item;
    });
}

function getModule(module: any): any {
  if (Array.isArray(module)) {
    return module.map((item) => getModule(item));
  }
  return module?.default ?? module;
}

type InjectDevice = 'web' | 'mobile' | 'both';

function envFilter(injects?: InjectUrlItem[]): InjectUrlItem[] {
  if (!injects) {
    return [];
  }

  const urlParams = parseQuery();

  // 从 window 或者 url 中获取当前是设计器还是预览环境；没有配置则读取 window 是否有 VisualEngine
  const hasEngineGlobal = Boolean(injectWindow.VisualEngine || injectWindow.LowcodeEditor || injectWindow.AliLowCodeEngine);
  const env = injectWindow.injectEnv
    || urlParams[injectEnvFlag]
    || (hasEngineGlobal ? 'design' : 'preview')
    || 'design';

  const rawDevice = (urlParams[injectDeviceFlag]
    || injectWindow.g_config?.device
    || injectWindow.pageConfig?.device
    || 'web') as InjectDevice;
  // 乐高有双端的能力，开启后 device 是 both
  const device: 'web' | 'mobile' = rawDevice === 'both'
    ? (/Mobile/.test(window.navigator.userAgent) ? 'mobile' : 'web')
    : (rawDevice === 'mobile' ? 'mobile' : 'web');

  let prototypeKey = urlParams[prototypeKeyFlag]
    || injectWindow.pageConfig?.designerConfigs?.prototypeKey;
  prototypeKey = prototypeKey === 'default' ? '' : prototypeKey;

  return injects.filter((item) => {
    if (env === 'design') {
      // 设计器不需要注入组件的 view 和 vu
      if (['utils'].indexOf(item.type!) >= 0) {
        return false;
      }
      // 注入指定的 prototype
      if (item.type === 'prototype') {
        if (item.subType && item.subType !== prototypeKey) {
          return false;
        }
        if (!item.subType && prototypeKey) {
          // 看有没有对应的 prototype.js 如果没有则用默认的
          const proto = injects.find((item2) => item2.packageName === item.packageName
            && item2.type === 'prototype'
            && item2.subType === prototypeKey);
          if (proto) {
            return false;
          }
        }
      }
    }
    if (env === 'preview') {
      // 预览不需要注入 prototype、vp、setter、pane
      if (['prototype', 'plugin', 'setter', 'pane'].indexOf(item.type!) >= 0) {
        return false;
      }
      // PC 端应用不需要加载 view.mobile
      if (device === 'web' && item.type === 'view' && item.subType === 'mobile') {
        return false;
      }
      // 移动端应用如果有 view.mobile 则不需要加载 view，否则还是加载 view
      if (device === 'mobile' && item.type === 'view' && item.subType !== 'mobile') {
        // 看当前组件有没有 view.mobile
        const viewMobile = injects.find((item2) => item2.packageName === item.packageName
          && item2.type === 'view'
          && item2.subType === 'mobile');
        if (viewMobile) {
          return false;
        }
      }
    }
    return true;
  });
}

function getComponentFromUrlItems(items: InjectUrlItem[]): Record<string, ComponentUrlItem> {
  const map: Record<string, ComponentUrlItem> = {};
  items.forEach((item) => {
    const { packageName, type, url, library } = item;
    if (!packageName) {
      return;
    }
    if (!map[packageName]) {
      map[packageName] = {
        packageName,
      };
    }
    if (type) {
      map[packageName][type] = url;
    }
    map[packageName].library = library;
  });
  return map;
}

export interface InjectAssets {
  packages?: Array<Record<string, unknown>>;
  components?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function notifyInjected(title: string, names: string[], label: string): void {
  if (names.length === 0) {
    return;
  }
  Notification.success({
    title,
    content: (
      <div>
        {names.map((name) => (
          <p key={name}>{label}：<b>{name}</b></p>
        ))}
      </div>
    ),
  });
}

export async function injectAssets(assets: InjectAssets, injectOptions?: InjectOptions): Promise<InjectAssets> {
  if (!needInject) return assets;
  try {
    const injectUrls = await getInjectUrls('component', 'item', injectOptions) as InjectUrlItem[];
    const components = getComponentFromUrlItems(injectUrls);
    Object.keys(components).forEach((name) => {
      const item = components[name];
      const pascalCaseName = Case.pascal(name);
      if (!assets.packages) assets.packages = [];
      if (!assets.components) assets.components = [];
      assets.packages.push({
        package: name,
        version: '0.1.0',
        library: item.library || pascalCaseName,
        urls: [item.view],
        editUrls: [item.view],
      });
      assets.components.push({
        exportName: `${pascalCaseName}Meta`,
        url: item.meta,
      });
    });
    notifyInjected('成功注入以下组件', Object.keys(components), '组件');
  } catch (err) {
    console.error('[lowcode-plugin-inject] injectAssets failed', err);
  }
  return assets;
}

export async function injectComponents(
  components: Record<string, unknown>,
  injectOptions?: InjectOptions,
): Promise<Record<string, unknown>> {
  if (!needInject) return components;
  const injectUrls = await getInjectUrls('component', 'item', injectOptions) as InjectUrlItem[];
  await loadComponentFromSources(injectUrls.map((item) => item.url!).filter(Boolean));
  const injectedComponents = getComponentFromUrlItems(injectUrls);
  const libraryMap: Record<string, string> = {};
  const componentsMap: Record<string, IPublicTypeNpmInfo | React.ComponentType<any> | IPublicTypeComponentSchema> = {};
  Object.keys(injectedComponents).forEach((name) => {
    const { library } = injectedComponents[name];
    const pascalName = Case.pascal(name);
    libraryMap[name] = library || pascalName;
    const metaGlobal = injectWindow[`${pascalName}Meta`];
    metaGlobal?.components?.forEach((item: { componentName: string; npm: IPublicTypeNpmInfo }) => {
      componentsMap[item.componentName] = item.npm;
    });
  });
  // 这里 componentsMap 只会是 npm 描述信息（来自注入组件的 meta），
  // 不会出现 schema 形态的组件，因此 createComponent 分支实际不会被触发。
  const injectedComponentsForRenderer = buildComponents(libraryMap, componentsMap, () => null);
  notifyInjected('成功注入以下组件', Object.keys(injectedComponents), '组件');
  return { ...components, ...injectedComponentsForRenderer };
}

export interface InjectPackageItem {
  package: string;
  [key: string]: unknown;
}

export async function filterPackages(
  packages: InjectPackageItem[] = [],
  injectOptions?: InjectOptions,
): Promise<InjectPackageItem[]> {
  if (!needInject) return packages;
  const injectUrls = await getInjectUrls('component', 'item', injectOptions) as InjectUrlItem[];
  const injectedComponents = getComponentFromUrlItems(injectUrls);
  return packages.filter((item) => !(item.package in injectedComponents));
}

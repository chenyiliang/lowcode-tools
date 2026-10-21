import { set, get, has } from 'lodash';
import { EventEmitter } from './emitter';

/** 单个资源（视图维度）下的注入开关：viewName -> 是否注入 */
export type IInjectViewConfig = {
  [viewName: string]: boolean;
};

/** 单个插件下的注入配置：既可以直接是 boolean（全局/资源维度），也可以按视图细分 */
export type IInjectPluginConfig = {
  [resourceName: string]: IInjectViewConfig | boolean;
};

export type IInjectConfig = {
  [pluginName: string]: IInjectPluginConfig;
};

/** `onChange` 回调返回的取消订阅函数 */
export type Unsubscribe = () => void;

const STORAGE_KEY = '___inject_config___';

/**
 * 归一化 lodash 路径片段。
 *
 * `resourceName` / `viewName` 在 workspace 模式下可能拿不到（例如当前没有活跃窗口），
 * 此时它是一个必然 miss 的 key，读取应当回落到默认值 `false`，
 * 而不能因为 `undefined` 通不过 lodash `PropertyName` 的类型约束而报错。
 */
function toPathSegments(...keys: Array<string | undefined>): string[] {
  return keys.map((key) => key ?? '');
}

export class InjectConfig {
  _config: IInjectConfig = readStoredConfig();

  event: EventEmitter = new EventEmitter();

  get config(): IInjectConfig {
    return this._config;
  }

  onChange(fn: (config: IInjectConfig) => void): Unsubscribe {
    const listener = fn as (...args: unknown[]) => void;
    this.event.on('changeConfig', listener);
    return () => {
      this.event.off('changeConfig', listener);
    };
  }

  set(pluginName: string, resourceName?: string, viewName?: string, injected: boolean = false): void {
    const path = toPathSegments(pluginName, resourceName, viewName);
    // viewName 为空表示写到资源维度（布尔），否则写到视图维度
    set(this._config, viewName ? path : path.slice(0, 2), injected);
    this.notifyChange();
  }

  get(pluginName: string, resourceName?: string, viewName?: string): boolean {
    const path = toPathSegments(pluginName, resourceName, viewName);
    return get(this._config, viewName ? path : path.slice(0, 2), false) as boolean;
  }

  has(pluginName: string, resourceName?: string, viewName?: string): boolean {
    const path = toPathSegments(pluginName, resourceName, viewName);
    return has(this._config, viewName ? path : path.slice(0, 2));
  }

  clearAll(): void {
    this._config = {};
  }

  save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._config));
  }

  private notifyChange(): void {
    // lodash 的 set 是原地修改，这里换一个新的对象引用，保证 React 侧能感知到变化
    this._config = {
      ...this._config,
    };
    this.event.emit('changeConfig', this._config);
  }
}

function readStoredConfig(): IInjectConfig {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as IInjectConfig;
  } catch (err) {
    console.error('[lowcode-plugin-inject] 解析本地注入配置失败', err);
    return {};
  }
}

import type { IPublicTypePluginConfig, IPublicTypePluginMeta } from '@alilc/lowcode-types';

/**
 * 引擎运行时（designer/src/plugin/plugin-manager.ts）实际读取的插件配置形态：
 *
 * ```ts
 * pluginName = pluginName || config.name;   // 兼容旧式声明
 * ```
 *
 * 也就是说 `name` / `dep` 是运行时支持的一等字段，但 `@alilc/lowcode-types`
 * 导出的 `IPublicTypePluginConfig` 只声明了 `init` / `destroy` / `exports`。
 * 这里按运行时真实契约补齐，避免到处 `as any`。
 */
export interface IPluginConfig extends IPublicTypePluginConfig {
  /** 插件名，注册环境下唯一 */
  name: string;
  /** 依赖的插件名数组，引擎按依赖顺序初始化 */
  dep?: string[];
  /** 兼容部分插件把 meta 直接挂在 config 上的写法 */
  meta?: IPublicTypePluginMeta;
}

import React from 'react';
import { plugins, setters } from '@alilc/lowcode-engine';
import {
  IPublicModelPluginContext,
  IPublicEnumPluginRegisterLevel,
  IPublicTypePlugin,
} from '@alilc/lowcode-types';
import type { IPluginConfig } from './types';
import {
  getInjectedResource,
  injectAssets,
  needInject,
  injectComponents,
  filterPackages,
  setInjectServerHost,
  type InjectOptions,
} from './utils';
import { Notification } from '@alifd/next';
import { AppInject } from './appInject';

/** 注入插件名 -> 插件模块 */
type InjectedPluginMap = Record<string, any>;

let injectedPluginConfigMap: InjectedPluginMap | null = null;
let injectedPlugins: any[] = [];

export async function getInjectedPlugin(
  name: string | undefined,
  ctx: IPublicModelPluginContext,
  injectOptions?: InjectOptions,
): Promise<any> {
  if (!injectedPluginConfigMap) {
    injectedPluginConfigMap = {};
    injectedPlugins = await getInjectedResource('plugin', injectOptions);
    if (injectedPlugins && injectedPlugins.length > 0) {
      injectedPlugins.forEach((item: any) => {
        let pluginName = item.module?.pluginName;
        if (!pluginName) {
          const config = item.module(ctx) as IPluginConfig;
          pluginName = config?.name;
        }
        injectedPluginConfigMap![pluginName] = item.module;
      });
    }
  }
  if (name === undefined) return undefined;
  return injectedPluginConfigMap[name];
}

interface IOptions extends InjectOptions {
  injectServerHost?: string;
}

const Inject = (ctx: IPublicModelPluginContext, options: IOptions = {}): IPluginConfig => {
  const { injectServerHost, ...injectOptions } = options;
  if (!needInject) {
    return {
      name: 'LowcodePluginInjectAlt',
      init() {},
    };
  }

  if (ctx.registerLevel === IPublicEnumPluginRegisterLevel.Workspace) {
    return AppInject(ctx, options);
  }

  if (injectServerHost) {
    setInjectServerHost(injectServerHost);
  }

  // inject 已有的设计器插件
  // 覆盖后续的插件注册逻辑，所有只有本插件后面注册的插件才可以支持 inject 逻辑
  const originalRegister = plugins.register.bind(plugins);
  plugins.register = async (
    plugin: IPublicTypePlugin,
    pluginOptions?: Record<string, unknown>,
    registerOptions?: Parameters<typeof originalRegister>[2],
  ): Promise<void> => {
    let pluginName: string | undefined = plugin.pluginName;
    if (!pluginName) {
      // 兼容逻辑：老式插件把 creator 直接当插件传进来，pluginName 藏在返回的 config.name 上
      const pluginConfig = (plugin as unknown as (
        context: IPublicModelPluginContext,
        opts?: Record<string, unknown>,
      ) => IPluginConfig)(ctx, pluginOptions);
      pluginName = pluginConfig?.name;
    }
    const injectedSameNamePlugin = await getInjectedPlugin(pluginName, ctx, injectOptions);
    if (injectedSameNamePlugin) {
      injectedPluginConfigMap![pluginName] = null;
      return originalRegister(injectedSameNamePlugin, pluginOptions, registerOptions);
    }
    return originalRegister(plugin, pluginOptions, registerOptions);
  };

  return {
    // 插件名，注册环境下唯一
    name: 'LowcodePluginInjectAlt',
    // 依赖的插件（插件名数组）
    dep: [],
    // 插件的初始化函数，在引擎初始化之后会立刻调用
    async init() {
      // inject 新的设计器插件
      if (injectedPluginConfigMap) {
        // TODO 改为引擎的 onInit 事件
        setTimeout(async () => {
          for (const key in injectedPluginConfigMap) {
            if (injectedPluginConfigMap[key]) {
              // 这里是兼容新旧两种 API，新版只有 creator 和 options 两个入参，但老版有三个
              await plugins.register(injectedPluginConfigMap[key], { autoInit: true });
            }
          }
        });
      }
      const injectedSetters = await getInjectedResource('vs', injectOptions);
      injectedSetters.forEach((item: any) => {
        setters.registerSetter(item.module.displayName, item.module);
      });
      if (injectedPlugins.length > 0 || injectedSetters.length > 0) {
        Notification.success({
          title: '成功注入以下插件',
          content: (
            <div>
              {injectedPlugins.map((item: any, index: number) => (
                <p key={`plugin-${item.name ?? index}`}>设计器插件：<b>{item.name}</b></p>
              ))}
              {injectedSetters.map((item: any, index: number) => (
                <p key={`setter-${item.name ?? index}`}>setter：<b>{item.name}</b></p>
              ))}
            </div>
          ),
        });
      }
    },
  };
};

Inject.pluginName = 'LowcodePluginInjectAlt';

export default Inject;
Inject.meta = {
  dependencies: [],
  preferenceDeclaration: {
    title: '注入资源的主机地址',
    properties: [
      {
        key: 'injectServerHost',
        type: 'string',
        description: '注入资源的主机地址',
      },
    ],
  },
};

export {
  injectAssets,
  injectComponents,
  filterPackages,
};

export type { InjectOptions };

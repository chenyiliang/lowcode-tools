declare module '*.scss';
declare module '*.css';

declare module 'case';

interface InjectUrlItem {
  packageName?: string;
  name?: string;
  type?: string;
  subType?: string;
  url?: string;
  library?: string;
  module?: any;
  default?: any;
  pluginType?: string;
}

interface InjectWindow extends Window {
  injectConfig?: { type?: string; injects?: string[] } | any;
  injectEnv?: string;
  pageConfig?: { device?: string; designerConfigs?: { prototypeKey?: string } } | any;
  g_config?: { device?: string } | any;
  VisualEngine?: any;
  LowcodeEditor?: any;
  AliLowCodeEngine?: any;
  __components?: InjectUrlItem[];
  __injectComponent?: (component: InjectUrlItem) => void;
  [key: string]: any;
}

declare var injectConfig;
declare var pageConfig;
declare var injectEnv;
declare var g_config;
declare var VisualEngine;
declare var LowcodeEditor;
declare var AliLowCodeEngine;

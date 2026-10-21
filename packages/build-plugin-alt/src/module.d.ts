declare module '*.scss';
declare module '*.css';

declare module '__lowcode-setter-demo__';
declare module '__lowcode-plugin-demo__';
declare module '@ali/lowcode-plugin-variable-bind-dialog';
declare module 'moment-locales-webpack-plugin';

// 阿里内部老构建工具包，不带 TypeScript 声明也没有 @types，这里按实际调用签名声明
declare module 'build-plugin-component/src/compiler/babel' {
  interface BabelCompilerOptions {
    log?: unknown;
    type?: string;
    userOptions?: {
      // 来自 build-scripts 的 userConfig（Json 类型），透传给底层编译器
      basicComponents?: unknown;
      babelPlugins?: unknown[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }
  const babelCompiler: (context: unknown, options: BabelCompilerOptions) => void;
  export default babelCompiler;
}

declare var AliLowCodeEngine;
declare var AliLowCodeEngineExt;
declare var PACKAGE_NAME;

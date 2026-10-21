/**
 * `fie-api` 是阿里内部的脚手架工具包，不带 TypeScript 类型声明，
 * 也没有对应的 @types 包。这里按实际用到的接口（fs.copyDirectory）做最小声明，
 * 避免在 strict 模式下触发 TS7016（隐式 any）。
 */
declare module 'fie-api' {
  export interface CopyDirectoryParams {
    src: string;
    dist: string;
    data?: Record<string, unknown>;
    templateSettings?: {
      evaluate?: RegExp;
      interpolate?: RegExp;
      escape?: RegExp;
    };
    filenameTransformer?: (fileName: string) => string;
  }

  export const fs: {
    copyDirectory(params: CopyDirectoryParams): void;
    [key: string]: any;
  };

  const fieApi: {
    fs: typeof fs;
    [key: string]: any;
  };

  export default fieApi;
}

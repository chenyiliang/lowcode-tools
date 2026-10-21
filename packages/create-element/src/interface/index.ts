/** 交互式问答收集到的答案 */
export interface IAnswer {
  componentType: string;
  projectName: string;
  description: string;
  author: string;
  /** 组件初始化时选择的包模式（react-single / react-multiple） */
  packageType?: string;
  /** 模板渲染用的额外字段（如 engineScope） */
  [key: string]: unknown;
}

/** yargs 解析出来的命令行参数（只声明用到的字段） */
export interface IArgv {
  _: Array<string | number>;
  beta?: boolean;
  [key: string]: unknown;
}

/** 各初始化器（component / setter / plugin / editor）的构造入参 */
export interface InitOptions {
  argv: IArgv;
  answers: IAnswer;
  templatePkg: string;
  prefix: string;
}

/** 初始化器函数签名：接收答案，异步完成脚手架生成 */
export type Initializer = (answers: IAnswer) => Promise<void>;

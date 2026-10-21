import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fs as fieFs } from 'fie-api';
import inquirer from 'inquirer';
import Base from './base';
import { transformFileName } from './utils';
import { IAnswer, IArgv, InitOptions } from './interface';

class InitComponent extends Base {
  constructor(options: InitOptions) {
    super(options);
  }
  renderTpl() {
    const src = path.join(this.installPath, 'node_modules', this.templatePkg, 'projectTemplate');
    const copyParams = {
      src,
      dist: this.copyPath,
      data: this.answers,
      templateSettings: {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
      },
      filenameTransformer: transformFileName
    };
    fieFs.copyDirectory(copyParams);
  }
};

export default async (answers: IAnswer) => {
  const promptList = [{
    type: 'list',
    name: 'packageType',
    message: '请选择包模式',
    choices: [{
      name: 'react-单组件',
      value: 'react-single',
    }, {
      name: 'react-组件库',
      value: 'react-multiple',
    }],
    default: 'react-single',
  }];
  const result = await inquirer.prompt(promptList);
  new InitComponent({
    argv: (await yargs(hideBin(process.argv)).argv) as IArgv,
    answers: {
      ...result,
      ...answers,
      engineScope: '@alilc',
    },
    templatePkg: `@alilc/${result.packageType}-component-template`,
    prefix: 'lowcode-setter',
  }).init();
}
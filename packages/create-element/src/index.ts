import inquirer from 'inquirer';
import * as path from 'path';
import initComponent from './component';
import initSetter from './setter';
import initPlugin from './plugin';
import initEditor from './editor';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { IArgv, IAnswer, Initializer } from './interface';

interface IPromptAnswer {
  projectName: string;
}

const getQuestions = ({ argv }: { argv: IArgv }) => {
  return [
    {
      type: 'list',
      name: 'componentType',
      message: '请选择引擎生态元素类型',
      choices: [
        {
          name: '组件/物料',
          value: 'component',
        },
        {
          name: '设置器 (setter)',
          value: 'setter',
        },
        {
          name: '插件 (plugin)',
          value: 'plugin',
        },
        {
          name: '编辑器 (editor)',
          value: 'editor',
        },
      ]
    },
    {
      type: 'input',
      name: 'projectName',
      message: '生态元素包名',
      default() {
        const pathBaseName = path.basename(path.join(process.cwd(), String(argv._[0] || './')));
        return pathBaseName;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: '简要介绍生态元素',
      default(ans: IPromptAnswer) {
        return ans.projectName;
      },
    },
    {
      type: 'input',
      name: 'author',
      message: '作者名',
      default() {
        return process.env.USER || process.env.USERNAME;
      },
    },
  ];
}

const initMap: Record<string, Initializer> = {
  component: initComponent,
  setter: initSetter,
  plugin: initPlugin,
  editor: initEditor,
};

const main = async () => {
  // yargs@18 的 .argv 是 Promise（@17 是同步），需要先 await 再交给问答逻辑
  const argv = (await yargs(hideBin(process.argv))
    .options('beta', {
      type: 'boolean',
      describe: 'use beta template package to init',
      default: false,
    })
    .argv) as IArgv;
  const result = await inquirer.prompt(getQuestions({ argv }));
  const initializer = initMap[result.componentType];
  await initializer(result as IAnswer);
}

main();

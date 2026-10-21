import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import InitFunc from './base';
import { IAnswer, IArgv } from './interface';

export default async (answers: IAnswer) => {
  new InitFunc({
    argv: (await yargs(hideBin(process.argv)).argv) as IArgv,
    answers,
    templatePkg: '@alilc/lowcode-template-editor',
    prefix: 'lowcode-editor',
  }).init();
}

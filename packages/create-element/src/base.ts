import fs from 'fs-extra';
import * as path from 'path';
import spawn from 'cross-spawn';
import Case from 'case';
import ejs from 'ejs';
import dayjs from 'dayjs';
import * as glob from 'glob';
import chalk from 'chalk';
import { IAnswer, InitOptions } from './interface';
import { getInstallPath, transformFileName } from './utils';

export default class InitFunc {
  projectName: string;
  installPath: string;
  templatePkg: string;
  copyPath: string;
  answers: IAnswer;
  prefix: string;
  useBeta: boolean;
  constructor({ argv, answers, templatePkg, prefix }: InitOptions) {
    this.projectName = String(argv['_'][0] || './');
    this.installPath = getInstallPath();
    this.templatePkg = templatePkg;
    this.copyPath = path.join(process.cwd(), this.projectName);
    this.answers = answers;
    this.prefix = prefix;
    this.useBeta = Boolean(argv.beta);
  }
  addPrefix(name: string): string {
    const prefix = this.prefix;
    if (new RegExp(`^${prefix}`).test(name)) {
      return name;
    }
    return `${prefix}-${name}`;
  }
  isDirEmpty(dir: string): boolean {
    return glob.sync('**', {
      cwd: dir,
      nodir: true,
      dot: true,
    }).length === 0;
  }
  ensureInstallPath() {
    fs.ensureDirSync(this.installPath);
  }
  installTpl() {

    spawn.sync('npm', [
      'install', 
      `${this.templatePkg}${this.useBeta ? '@beta' : '@latest'}`, 
      '--no-save', 
      '--no-package-lock', 
      '--no-shrinkwrap',
      '--registry=https://registry.npmmirror.com',
    ], { stdio: 'inherit', cwd: this.installPath });
  }

  renderTpl() {
    const templatePath = path.join(this.installPath, 'node_modules', this.templatePkg, 'proj');
    const setterName = this.addPrefix(this.answers.projectName);
    const setterComponentName = Case.pascal(setterName);
    const renderData = {
      ...this.answers,
      name: setterName,
      componentName: setterComponentName,
      version: '1.0.0',
      nowDate: dayjs().format('YYYY-MM-DD'),
    };
    fs.ensureDirSync(this.copyPath);
    if (!this.isDirEmpty(this.copyPath)) {
      console.log(chalk.red('需要初始化的项目目录不为空，请清空后重试'));
      return;
    }
    glob.sync('**', {
      cwd: templatePath,
      nodir: true,
      dot: true,
      ignore: ['node_modules/**'],
    }).forEach((fileName) => {
      const filePath = path.join(templatePath, fileName);
      const fileTpl = fs.readFileSync(filePath, 'utf-8');
      const fileContent = ejs.render(fileTpl, renderData);
      const copyPath = path.join(this.copyPath, transformFileName(fileName));
      fs.ensureFileSync(copyPath);
      fs.writeFileSync(copyPath, fileContent);
    });
  }

  initInstallPathPackageJson() {
    const pkgPath = path.join(this.installPath, 'package.json');
    const isExist = fs.pathExistsSync(pkgPath);
    if (isExist) return;
    fs.writeFileSync(pkgPath, JSON.stringify({ private: true }, null, ' '));
  }

  init() {
    console.log(chalk.green('正在为你初始化项目，请稍等...'));
    this.ensureInstallPath();
    this.initInstallPathPackageJson();
    this.installTpl();
    this.renderTpl();
  }
}
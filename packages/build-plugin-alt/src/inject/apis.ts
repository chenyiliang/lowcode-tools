import Koa from 'koa';
import Router from '@koa/router';
import * as fs from 'fs-extra';
import * as net from 'net';
import { uniqWith, isEqual, isEmpty } from 'lodash';
import axios from 'axios';
import { getFilePath } from './utils';
import * as logger from '../utils/logger';


const app = new Koa();
const router = new Router();

/** inject.json 里的一条资源记录（只用到 url 字段） */
interface InjectResource {
  url: string;
  [key: string]: unknown;
}

async function checkUrl(item: InjectResource): Promise<InjectResource | undefined> {
  const { url } = item;
  try {
    await axios.head(url, {
      timeout: 1000,
    });
    return item;
  } catch (error) {
  }
}

function makeJsonpStr(cbName: string, data: unknown): string {
  return `;${cbName}(${JSON.stringify(data)})`
}

async function portIsOccupied(_port: number, _host: string): Promise<boolean> {
  const server = net.createServer().listen(_port, _host);
  // eslint-disable-next-line no-shadow
  return new Promise((resolve) => {
    server.on('listening', () => {
      server.close();
      resolve(false);
    });

    server.on('error', () => {
      resolve(true);
    });

  });
}

const PORT = 8899;
const HOST = '0.0.0.0';

const init = async () => {

  if (await portIsOccupied(PORT, HOST)) {
    const timer = setInterval(async () => {
      const isOccupied = await portIsOccupied(PORT, HOST);
      if (!isOccupied) {
        logger.info('Original inject server is down, start another')
        clearInterval(timer);
        init();
      }
    }, 5000);
    return;
  }

  router.get('/apis/injectInfo', async (ctx) => {
    ctx.res.setHeader('Access-Control-Allow-Origin', '*');
    ctx.res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , sessionToken',
    );
    ctx.res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    ctx.type = 'text/javascript';
    const rawCallback = ctx.query.callback;
    const callbackName = (Array.isArray(rawCallback) ? rawCallback[0] : rawCallback) || 'callback';
    const filePath = getFilePath();
    let cache: Record<string, InjectResource> = {};
    try {
      cache = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, InjectResource>;
    } catch (err) {
      ctx.body = makeJsonpStr(callbackName, {
        success: false,
        content: [],
      });
      return;
    }
    let data: InjectResource[] = Object.values(cache);

    data = uniqWith(data, isEqual); // 去重
    // check inject 是否可访问
    const checkData = (await Promise.all(data.map(checkUrl))).filter(Boolean);
    ctx.body = makeJsonpStr(callbackName, {
      success: !isEmpty(data),
      content: checkData,
    });
  });

  app
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, HOST, () => {
      logger.info('Inject server started', { needBreak: true });
    });
};

export default init;


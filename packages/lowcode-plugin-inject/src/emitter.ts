/**
 * 极简事件发射器。
 *
 * 原先这里用的是 Node 内置的 `events` 模块，但本包是浏览器端设计器插件，
 * Vite 8 / webpack 5 都不再自动为浏览器 polyfill Node 内置模块，
 * 保留 `import { EventEmitter } from 'events'` 会让消费方构建直接失败。
 * 这里只用到 on / off / emit 三个方法，用等价的本地实现替换，并保留完整类型。
 */
export type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, listener: Listener): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return false;
    }
    // 拷贝一份，避免监听器在回调里 off 自己导致遍历出错
    [...set].forEach((listener) => listener(...args));
    return true;
  }
}

export default EventEmitter;

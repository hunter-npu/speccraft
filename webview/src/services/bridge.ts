import { vscode } from '../vscode';
import type { VscodeMessage } from '../types/message';

type MessageHandler = (payload: unknown) => void;

const handlers = new Map<string, MessageHandler[]>();

export const bridge = {
  send(message: VscodeMessage): void {
    vscode.postMessage(message);
  },

  on(type: string, handler: MessageHandler): () => void {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type)!.push(handler);
    return () => {
      const list = handlers.get(type);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  },

  dispatch(message: VscodeMessage): void {
    const list = handlers.get(message.type);
    if (list) {
      list.forEach((h) => h(message.payload));
    }
  },
};

// Set up global message listener
window.addEventListener('message', (event) => {
  const message = event.data as VscodeMessage;
  if (message && message.type) {
    bridge.dispatch(message);
  }
});

// Singleton wrapper for acquireVsCodeApi
// In browser (dev mode), provides a mock

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let _api: VsCodeApi | null = null;

function getVsCodeApi(): VsCodeApi {
  if (_api) return _api;

  if (typeof acquireVsCodeApi !== 'undefined') {
    _api = acquireVsCodeApi();
  } else {
    // Browser dev mock
    _api = {
      postMessage: (msg: unknown) => console.log('[vscode mock] postMessage', msg),
      getState: () => null,
      setState: (s: unknown) => console.log('[vscode mock] setState', s),
    };
  }
  return _api;
}

export const vscode = {
  postMessage: (msg: unknown) => getVsCodeApi().postMessage(msg),
  getState: () => getVsCodeApi().getState(),
  setState: (s: unknown) => getVsCodeApi().setState(s),
};

// Shared types for SpecCraft extension host

export interface SpecMeta {
  specId: string;
  title: string;
  version: string;
  created: string;
  updated: string;
}

export interface SpecJson {
  specId: string;
  title: string;
  version: string;
}

export interface SpecFile {
  specId: string;
  title: string;
  version: string;
  mdPath: string;
  created: string;
  updated: string;
}

export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

// Message types for webview <-> extension communication
export type MessageType =
  | 'LOAD_SPEC_LIST'
  | 'SPEC_LIST_LOADED'
  | 'NEW_SPEC'
  | 'SPEC_CREATED'
  | 'LLM_STREAM_REQUEST'
  | 'LLM_STREAM_CHUNK'
  | 'LLM_STREAM_DONE'
  | 'LLM_STREAM_ERROR'
  | 'LLM_STREAM_CANCEL'
  | 'LOAD_SPEC'
  | 'SPEC_LOADED'
  | 'APPLY_IMPROVEMENT'
  | 'GIT_COMMIT'
  | 'GIT_LOG'
  | 'GIT_LOG_LOADED'
  | 'GIT_CHECKOUT'
  | 'LLM_CONFIG_GET'
  | 'LLM_CONFIG_SET'
  | 'LLM_CONFIG_LOADED'
  | 'ERROR'
  | 'INFO';

export interface VscodeMessage {
  type: MessageType;
  payload?: unknown;
}

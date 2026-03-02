import { create } from 'zustand';
import { bridge } from '../services/bridge';

interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

interface GitState {
  commits: GitCommit[];
  isLoading: boolean;

  setCommits: (commits: GitCommit[]) => void;
  setLoading: (loading: boolean) => void;
  loadLog: () => void;
  commit: (message: string, specId: string) => void;
  checkout: (hash: string) => void;
}

export const useGitStore = create<GitState>()((set) => ({
  commits: [],
  isLoading: false,

  setCommits: (commits) => set({ commits }),
  setLoading: (loading) => set({ isLoading: loading }),

  loadLog: () => {
    set({ isLoading: true });
    bridge.send({ type: 'GIT_LOG' });
  },

  commit: (message, specId) => {
    bridge.send({ type: 'GIT_COMMIT', payload: { message, specId } });
  },

  checkout: (hash) => {
    bridge.send({ type: 'GIT_CHECKOUT', payload: { hash } });
  },
}));

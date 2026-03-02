import { create } from 'zustand';
import type { SpecFile, SpecJson } from '../types/spec';
import { bridge } from '../services/bridge';

interface SpecState {
  specList: SpecFile[];
  currentSpec: SpecJson | null;
  currentMdContent: string;
  isLoading: boolean;

  setSpecList: (specs: SpecFile[]) => void;
  loadSpec: (specId: string) => void;
  setCurrentSpec: (spec: SpecJson, mdContent: string) => void;
  setLoading: (loading: boolean) => void;
  refreshSpecList: () => void;
}

export const useSpecStore = create<SpecState>()((set) => ({
  specList: [],
  currentSpec: null,
  currentMdContent: '',
  isLoading: false,

  setSpecList: (specs) => set({ specList: specs }),

  loadSpec: (specId) => {
    set({ isLoading: true });
    bridge.send({ type: 'LOAD_SPEC', payload: { specId } });
  },

  setCurrentSpec: (spec, mdContent) =>
    set({ currentSpec: spec, currentMdContent: mdContent, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  refreshSpecList: () => bridge.send({ type: 'LOAD_SPEC_LIST' }),
}));

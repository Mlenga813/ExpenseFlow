import { create } from 'zustand';

interface AppState {
  currentPage: string;
  currentRequestId: string | null;
  navigate: (page: string, requestId?: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'login',
  currentRequestId: null,
  navigate: (page, requestId = null) => set({ currentPage: page, currentRequestId: requestId }),
}));

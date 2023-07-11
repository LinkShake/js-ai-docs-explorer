import { create } from "zustand";

type Models = "gpt-3.5-turbo" | "gpt-3.5-turbo-16k" | "gpt-3.5";

interface UiState {
  newData: boolean;
  originalQuery: string;
  isLoading: boolean;
  setNewData: (value: boolean) => void;
  setOriginalQuery: (query: string) => void;
  setIsLoading: (value: boolean) => void;
}

interface SettingsState {
  model: Models;
  temperature: number;
  index: string;
  possibleIndexes: any[];
  changeModel: (newModel: Models) => void;
  changeIndex: (newIndex: string) => void;
  changeTemperature: (newTemperature: number) => void;
  changePossibleIndexes: (indexes: any[]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  newData: false,
  originalQuery: "",
  isLoading: false,
  setNewData: (value) => set((state) => ({ newData: value })),
  setOriginalQuery: (query) => set((state) => ({ originalQuery: query })),
  setIsLoading: (value) => set((state) => ({ isLoading: value })),
}));

export const useSettingsStore = create<SettingsState>((set) => ({
  model: "gpt-3.5-turbo-16k",
  temperature: 0.1,
  index: "",
  possibleIndexes: [],
  changeModel: (newModel) => set((state) => ({ model: newModel })),
  changeIndex: (newIndex) => set((state) => ({ index: newIndex })),
  changeTemperature: (newTemperature) =>
    set((state) => ({ temperature: newTemperature })),
  changePossibleIndexes: (indexes) =>
    set((state) => ({ possibleIndexes: indexes })),
}));

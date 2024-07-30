import { atom } from "jotai";

export const currentScreenAtom = atom("home");
export const selectedPromptAtom = atom<any>(null);
export const alertMessageAtom = atom<string | null>(null);

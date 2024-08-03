import { atom } from "jotai";

export const currentScreenAtom = atom("home");
export const selectedPromptAtom = atom<any>(null);
export const alertMessageAtom = atom<string | null>(null);
export const currentWizardStepAtom = atom(1);

// New atoms for TestScreen
export const categoryAtom = atom("");
export const tagsAtom = atom<string[]>([]);
export const promptNameAtom = atom("");

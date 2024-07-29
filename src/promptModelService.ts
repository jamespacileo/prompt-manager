import { Service, Inject } from "typedi";
import { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import { PromptModel } from "./promptModel";
import { PromptFileSystem } from "./promptFileSystem";
import type { IPromptModelRequired } from "./types/interfaces";

@Service()
export class PromptService {
    constructor(
        @Inject() public fileSystem: PromptFileSystem,
        @Inject() public configManager: PromptProjectConfigManager
    ) { }

    async loadPromptByName(name: string): Promise<PromptModel> {
        const [category, promptName] = name.split('/');
        const promptData = await this.fileSystem.loadPrompt({ category, promptName });
        return new PromptModel(promptData as IPromptModelRequired);
    }

    async promptExists(name: string): Promise<boolean> {
        const [category, promptName] = name.split('/');
        return this.fileSystem.promptExists({ category, promptName });
    }

    async listPrompts(category?: string): Promise<Array<PromptModel>> {
        return await this.fileSystem.listPrompts({ category });
    }

    async deletePrompt(category: string, name: string): Promise<void> {
        await this.fileSystem.deletePrompt({ category, promptName: name });
    }
}

import { z } from "zod";
type IAsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

declare module "prompt-manager" {
  export class PromptManagerClient {
    
    

    
    
    

    
    
    

    
    
    

    
    
    

    
    

    
    writing: {
      
      writinggenerateprompt: {
        format: (inputs: writinggenerateprompt) => Promise<string>;
        execute: (inputs: writinggenerateprompt) => Promise<writinggenerateprompt>;
        stream: (inputs: writinggenerateprompt) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
      
    };
    
    creative writing: {
      
    };
    
    prompt generation: {
      
    };
    
    prompt creation: {
      
    };
    
    text processing: {
      
    };
    
  }

  export const promptManager: PromptManagerClient;
}
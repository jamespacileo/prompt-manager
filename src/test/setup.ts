/**
 * TextEncoderStream polyfill based on Node.js' implementation https://github.com/nodejs/node/blob/3f3226c8e363a5f06c1e6a37abd59b6b8c1923f1/lib/internal/webstreams/encoding.js#L38-L119 (MIT License)
 */
export class TextEncoderStream {
    #pendingHighSurrogate: string | null = null

    #handle = new TextEncoder()

    #transform = new TransformStream<string, Uint8Array>({
        transform: (chunk, controller) => {
            // https://encoding.spec.whatwg.org/#encode-and-enqueue-a-chunk
            chunk = String(chunk)

            let finalChunk = ""
            for (let i = 0; i < chunk.length; i++) {
                const item = chunk[i]
                const codeUnit = item.charCodeAt(0)
                if (this.#pendingHighSurrogate !== null) {
                    const highSurrogate = this.#pendingHighSurrogate

                    this.#pendingHighSurrogate = null
                    if (0xdc00 <= codeUnit && codeUnit <= 0xdfff) {
                        finalChunk += highSurrogate + item
                        continue
                    }

                    finalChunk += "\uFFFD"
                }

                if (0xd800 <= codeUnit && codeUnit <= 0xdbff) {
                    this.#pendingHighSurrogate = item
                    continue
                }

                if (0xdc00 <= codeUnit && codeUnit <= 0xdfff) {
                    finalChunk += "\uFFFD"
                    continue
                }

                finalChunk += item
            }

            if (finalChunk) {
                controller.enqueue(this.#handle.encode(finalChunk))
            }
        },

        flush: (controller) => {
            // https://encoding.spec.whatwg.org/#encode-and-flush
            if (this.#pendingHighSurrogate !== null) {
                controller.enqueue(new Uint8Array([0xef, 0xbf, 0xbd]))
            }
        },
    });

    get encoding() {
        return this.#handle.encoding
    }

    get readable() {
        return this.#transform.readable
    }

    get writable() {
        return this.#transform.writable
    }

    get [Symbol.toStringTag]() {
        return 'TextEncoderStream'
    }
}

/**
 * TextDecoderStream polyfill based on Node.js' implementation https://github.com/nodejs/node/blob/3f3226c8e363a5f06c1e6a37abd59b6b8c1923f1/lib/internal/webstreams/encoding.js#L121-L200 (MIT License)
 */
export class TextDecoderStream {
    #handle: TextDecoder

    #transform = new TransformStream({
        transform: (chunk, controller) => {
            const value = this.#handle.decode(chunk, { stream: true })

            if (value) {
                controller.enqueue(value)
            }
        },
        flush: controller => {
            const value = this.#handle.decode()
            if (value) {
                controller.enqueue(value)
            }

            controller.terminate()
        }
    })

    constructor(encoding = "utf-8", options: TextDecoderOptions = {}) {
        this.#handle = new TextDecoder(encoding, options)
    }

    get encoding() {
        return this.#handle.encoding
    }

    get fatal() {
        return this.#handle.fatal
    }

    get ignoreBOM() {
        return this.#handle.ignoreBOM
    }

    get readable() {
        return this.#transform.readable
    }

    get writable() {
        return this.#transform.writable
    }

    get [Symbol.toStringTag]() {
        return "TextDecoderStream"
    }
}

if (typeof globalThis.TextDecoderStream === 'undefined') {
    // @ts-ignore
    globalThis.TextDecoderStream = TextDecoderStream;
}

// Ensure the polyfill is applied
const ensureTextDecoderStream = () => {
    if (typeof globalThis.TextDecoderStream === 'undefined') {
        throw new Error('TextDecoderStream is not defined after polyfill');
    }
};

ensureTextDecoderStream();

logger.info("TextDecoderStream polyfill is working");

import fs from 'fs/promises';
import path from 'path';
import "./setupEnvs"
// Create test directories
const testDirs = ['test_prompts', 'test_output'];
Promise.all(testDirs.map(dir => fs.mkdir(dir, { recursive: true })))
    .then(() => logger.info('Test directories created'))
    .catch(logger.error);

// Create test-fury-config.json
const testConfig = {
    promptsDir: 'test_prompts',
    outputDir: 'test_output'
};

fs.writeFile('test-fury-config.json', JSON.stringify(testConfig, null, 2))
    .then(() => logger.info('test-fury-config.json created'))
    .catch(logger.error);

export { };

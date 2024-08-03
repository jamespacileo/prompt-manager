/**
 * TextEncoderStream polyfill based on Node.js' implementation https://github.com/nodejs/node/blob/3f3226c8e363a5f06c1e6a37abd59b6b8c1923f1/lib/internal/webstreams/encoding.js#L38-L119 (MIT License)
 */
export declare class TextEncoderStream {
	#private;
	get encoding(): string;
	get readable(): ReadableStream<Uint8Array>;
	get writable(): WritableStream<string>;
	get [Symbol.toStringTag](): string;
}
/**
 * TextDecoderStream polyfill based on Node.js' implementation https://github.com/nodejs/node/blob/3f3226c8e363a5f06c1e6a37abd59b6b8c1923f1/lib/internal/webstreams/encoding.js#L121-L200 (MIT License)
 */
export declare class TextDecoderStream {
	#private;
	constructor(encoding?: string, options?: TextDecoderOptions);
	get encoding(): string;
	get fatal(): boolean;
	get ignoreBOM(): boolean;
	get readable(): ReadableStream<any>;
	get writable(): WritableStream<any>;
	get [Symbol.toStringTag](): string;
}
import "./setupEnvs";

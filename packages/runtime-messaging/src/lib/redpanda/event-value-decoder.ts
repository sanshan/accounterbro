export type EventValueDecodeResult =
    | { readonly status: 'decoded'; readonly value: unknown }
    | { readonly status: 'invalid' };

export interface EventValueDecoder {
    decode(value: Buffer): Promise<EventValueDecodeResult>;
}

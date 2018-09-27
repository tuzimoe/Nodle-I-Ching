import { BinaryGF, ReedSolomonDecoder } from "../common/reedsolomon";
import { Encoder } from "../encoder/Encoder";
import { DecodedIChing } from "./DecodedIChing";

/**
 * Decoder class encapsulating IChing content decoding methods.
 *
 * @export
 * @class Decoder
 */
export class Decoder {
    /**
     * Creates a payload string from received IChing raw data. Assumes metadata symbols are always
     * correct.
     *
     * @param {Uint8ClampedArray} received - Raw data.
     * @returns { DecodedIChing } - Decoded payload and code metadata.
     */
    public decode(received: Uint8ClampedArray): DecodedIChing {
        const version = received[0];
        const size = Math.round(Math.sqrt(received.length));

        if (version !== Encoder.VERSION || size * size !== received.length) {
            throw new Error("Invalid IChing code!");
        }

        // Payload length.
        const dataLength = received[1];
        if (dataLength === 0) {
            throw new Error("Invalid IChing code!");
        }
        // Metadata length.
        const offset: number = Encoder.OFFSET;

        // Calculate the number of error correction symbols. Must be even.
        const ecSymbols = (received.length - offset - dataLength) & (~1);

        // Correct potential errors.
        const rsDecoder = new ReedSolomonDecoder(BinaryGF.BINARY_GF_6);
        let corrected: Uint8ClampedArray;
        // ReedSolomonDecoder will throw errors if the correction process fails, when either the
        // error locations are computed incorrectly, or the number of errors is above the limit.
        try {
            corrected = rsDecoder.decode(received, ecSymbols);
        } catch (e) {
            throw new Error("Invalid IChing Code!");
        }

        // This check is useful when most symbols are altered to zeroes, which will result in a
        // wrong correction that passes the ReedSolomonDecoder checks, but will alter the metadata
        // symbols to wrong values.
        for (let i = 0; i < offset; i++) {
            if (corrected[i] !== received[i]) {
                throw new Error("Invalid IChing Code!");
            }
        }

        // Convert corrected data to string.
        const table = Encoder.MAPPING_TABLE;
        let payload: string = "";
        for (let i = 0; i < dataLength; i++) {
            const charCode = table.indexOf(corrected[offset + i]);
            if (charCode === -1) {
                throw new Error("Invalid IChing Code!");
            }

            payload += String.fromCharCode(charCode);
        }

        return {
            version,
            size,
            data: payload,
            patterns: null,
        };
    }
}

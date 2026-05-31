const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const MAX_CHUNK_BYTES = 64;
const BYTE_MASK = 0xff;
const WORD_HEX_LENGTH = 8;

function rotateRight(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

function add32(...values: number[]) {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

export class Sha256 {
  private readonly hash = [...INITIAL_HASH];
  private readonly buffer = new Uint8Array(MAX_CHUNK_BYTES);
  private bufferLength = 0;
  private bytesHashed = 0;
  private finished = false;

  update(chunk: Uint8Array): this {
    if (this.finished) throw new Error('SHA-256 digest already finalized');

    let offset = 0;
    this.bytesHashed += chunk.length;

    while (offset < chunk.length) {
      const space = MAX_CHUNK_BYTES - this.bufferLength;
      const input = chunk.subarray(offset, offset + space);
      this.buffer.set(input, this.bufferLength);
      this.bufferLength += input.length;
      offset += input.length;

      if (this.bufferLength === MAX_CHUNK_BYTES) {
        this.processBlock(this.buffer);
        this.bufferLength = 0;
      }
    }

    return this;
  }

  digestHex(): string {
    if (!this.finished) {
      this.finalize();
      this.finished = true;
    }

    return this.hash.map((word) => word.toString(16).padStart(WORD_HEX_LENGTH, '0')).join('');
  }

  private finalize() {
    const bitsHashedHigh = Math.floor((this.bytesHashed * 8) / 0x1_0000_0000);
    const bitsHashedLow = (this.bytesHashed * 8) >>> 0;

    this.buffer[this.bufferLength++] = 0x80;

    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength, MAX_CHUNK_BYTES);
      this.processBlock(this.buffer);
      this.bufferLength = 0;
    }

    this.buffer.fill(0, this.bufferLength, 56);
    this.buffer[56] = (bitsHashedHigh >>> 24) & BYTE_MASK;
    this.buffer[57] = (bitsHashedHigh >>> 16) & BYTE_MASK;
    this.buffer[58] = (bitsHashedHigh >>> 8) & BYTE_MASK;
    this.buffer[59] = bitsHashedHigh & BYTE_MASK;
    this.buffer[60] = (bitsHashedLow >>> 24) & BYTE_MASK;
    this.buffer[61] = (bitsHashedLow >>> 16) & BYTE_MASK;
    this.buffer[62] = (bitsHashedLow >>> 8) & BYTE_MASK;
    this.buffer[63] = bitsHashedLow & BYTE_MASK;
    this.processBlock(this.buffer);
  }

  private processBlock(block: Uint8Array) {
    const words = new Array<number>(64);

    for (let index = 0; index < 16; index += 1) {
      const offset = index * 4;
      words[index] =
        ((block[offset] << 24) | (block[offset + 1] << 16) | (block[offset + 2] << 8) | block[offset + 3]) >>> 0;
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = add32(words[index - 16], s0, words[index - 7], s1);
    }

    let [a, b, c, d, e, f, g, h] = this.hash;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = add32(h, s1, choice, ROUND_CONSTANTS[index], words[index]);
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add32(s0, majority);

      h = g;
      g = f;
      f = e;
      e = add32(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add32(temp1, temp2);
    }

    this.hash[0] = add32(this.hash[0], a);
    this.hash[1] = add32(this.hash[1], b);
    this.hash[2] = add32(this.hash[2], c);
    this.hash[3] = add32(this.hash[3], d);
    this.hash[4] = add32(this.hash[4], e);
    this.hash[5] = add32(this.hash[5], f);
    this.hash[6] = add32(this.hash[6], g);
    this.hash[7] = add32(this.hash[7], h);
  }
}


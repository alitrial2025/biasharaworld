import { createHmac } from "node:crypto";

export function currentAuthenticatorCode(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((letter) => alphabet.indexOf(letter).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const index = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(index) & 0x7fffffff) % 1_000_000).padStart(
    6,
    "0",
  );
}

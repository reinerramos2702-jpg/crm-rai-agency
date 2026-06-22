import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function key() {
  const hex = process.env.KEYS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('KEYS_ENCRYPTION_KEY missing or not 32 bytes hex');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ct.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(ciphertext: string, iv: string, authTag: string) {
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);
  return pt.toString('utf8');
}

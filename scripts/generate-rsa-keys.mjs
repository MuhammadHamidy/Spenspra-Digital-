import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const keysDir = path.join(rootDir, 'shared', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyPath = path.join(keysDir, 'jwt_private.pem');
const publicKeyPath = path.join(keysDir, 'jwt_public.pem');

console.log('Generating RSA 2048-bit Key Pair for Spenspra SSO (RS256)...');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

fs.writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8' });
fs.writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8' });

console.log('RSA 2048-bit Key Pair generated successfully:');
console.log(` - Private Key: ${privateKeyPath}`);
console.log(` - Public Key : ${publicKeyPath}`);

const fs = require('fs');

function getKey(apiToken) {
  let crc = 0xffffffff;

  for (let i = 0; i < apiToken.length; i++) {
    crc ^= apiToken.charCodeAt(i);

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return ((crc ^ 0xffffffff) >>> 0)
    .toString(16)
    .padStart(8, '0');
}

function decrypt(data, key) {
  const decoded = Buffer.from(data.trim(), 'base64');

  let result = '';

  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded[i] ^ key.charCodeAt(i % key.length)
    );
  }

  return result;
}

if (process.argv.length < 4) {
  console.log('Usage: node decrypt.js <encrypted_file> <api_token>');
  process.exit(1);
}

const filePath = process.argv[2];
const apiToken = process.argv[3];

const encryptedData = fs.readFileSync(filePath, 'utf8');
const key = getKey(apiToken);

console.log('[+] Key:', key);

const plaintext = decrypt(encryptedData, key);

try {
  const obj = JSON.parse(plaintext);
  console.log(JSON.stringify(obj, null, 2));
} catch {
  console.log(plaintext);
}
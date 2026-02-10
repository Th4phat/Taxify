import * as Crypto from 'expo-crypto';

export async function generateUUID(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

  const hexArray = Array.from(randomBytes, (byte) => {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  });
  
  return (
    hexArray.slice(0, 4).join('') +
    '-' +
    hexArray.slice(4, 6).join('') +
    '-' +
    hexArray.slice(6, 8).join('') +
    '-' +
    hexArray.slice(8, 10).join('') +
    '-' +
    hexArray.slice(10, 16).join('')
  );
}

export function generateUUIDSync(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import bip39 from 'bip39';
import { derivePath } from "ed25519-hd-key";
import { AptosAccount } from "aptos";
import * as dotenv from 'dotenv';
dotenv.config();

const mnemonic = process.env.MNEMONIC ?? bip39.generateMnemonic();
console.log('mnemonic :', mnemonic);

if (process.argv[1].includes('utils/account.mjs')) {
  await getAccounts();
}

export async function getAccounts() {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const { key: key0 } = derivePath("m/44'/637'/0'/0'/0'", Buffer.from(seed).toString("hex"));
  const { key: key1 } = derivePath("m/44'/637'/1'/0'/0'", Buffer.from(seed).toString("hex"));
  const { key: key2 } = derivePath("m/44'/637'/2'/0'/0'", Buffer.from(seed).toString("hex"));
  const alice = new AptosAccount(key0);
  const bob = new AptosAccount(key1);
  const charlie = new AptosAccount(key2);

  console.log('\nAuth Keys :');
  console.log('  alice   :', alice.address().hexString);
  console.log('  bob     :', bob.address().hexString);
  console.log('  charlie :', charlie.address().hexString);

  return { alice, bob, charlie };
}

// alice : _AptosAccount {
//   signingKey: {
//     publicKey: Uint8Array(32) [
//       174, 203, 178,  33,  77, 84, 200, 128,
//        62, 101, 207, 182,  81,  7, 152, 111,
//       148, 108, 117,  44,   3,  1, 225, 237,
//        11, 163,  38, 195, 133, 85, 175, 101
//     ],
//     secretKey: Uint8Array(64) [
//       130, 250,  42,  26, 246, 115, 100,  94, 118, 147, 140,
//        84, 103, 178, 224, 104, 132,  65, 137,  80,  24,  77,
//       117, 236,  75, 113, 253, 141,  56,  64, 164, 216, 174,
//       203, 178,  33,  77,  84, 200, 128,  62, 101, 207, 182,
//        81,   7, 152, 111, 148, 108, 117,  44,   3,   1, 225,
//       237,  11, 163,  38, 195, 133,  85, 175, 101
//     ]
//   },
//   accountAddress: HexString {
//     hexString: '0x8e638061b4d63bd347471555234e119090e935f28d56399b34b6f2c0b9843f5c'
//   }
// }

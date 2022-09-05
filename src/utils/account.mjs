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
  const { key: key1 } = derivePath("m/44'/637'/0'/0'/1'", Buffer.from(seed).toString("hex"));
  const { key: key2 } = derivePath("m/44'/637'/0'/0'/2'", Buffer.from(seed).toString("hex"));
  const alice = new AptosAccount(key0);
  const bob = new AptosAccount(key1);
  const charlie = new AptosAccount(key2);

  console.log('\nAuth Keys :');
  console.log('  alice   :', alice.address().hexString);
  console.log('  bob     :', bob.address().hexString);
  console.log('  charlie :', charlie.address().hexString);

  return { alice, bob, charlie };
}

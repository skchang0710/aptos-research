import * as api from './utils/api.mjs';
import { getAccounts } from './utils/account.mjs';
import { checkKeyRotation, rotateAuthKeyEd25519 } from './utils/keyRotation.mjs';
import { getAccountTransferPayload, getSignedTransaction } from './utils/tx.mjs';

async function transfer(authAccount, senderAddr, receiverAddr, amount) {
  const chainId = await api.getChainId();
  const { sequence } = await api.getSequenceAndAuthKey(senderAddr);
  const payload = getAccountTransferPayload(receiverAddr, amount);
  const { signedTx } = getSignedTransaction(authAccount, senderAddr, sequence, chainId, payload);
  await api.sendTx(signedTx);
}

async function rotateKey(address, fromAccount, toAccount) {
  try {
    const chainId = await api.getChainId();
    const { signedTx } = await rotateAuthKeyEd25519(address, fromAccount, toAccount, chainId);
    await api.sendTx(signedTx);
  } catch (error) {
    console.log('\n*** Key Rotation Failure ***');
    console.log(error);
  }
}

async function showBalances(alice, bob, charlie) {
  console.log(`Alice   : ${await api.accountBalance(alice.address())}`);
  console.log(`Bob     : ${await api.accountBalance(bob.address())}`);
  console.log(`Charlie : ${await api.accountBalance(charlie.address())}`);
}

(async ()=>{
  try {
    const { alice, bob, charlie } = await getAccounts();

    // ** test tool 1 : faucet
    await api.fundAccount(alice.address(), 5000);

    console.log("\n=== Initial Balances ===");
    await showBalances(alice, bob, charlie);

    // ** test tool 2 : transfer
    await transfer(bob, alice.address(), bob.address(), 2000); // fromAuth, fromAddr, toAddr, amount

    // ** test tool 3 : rotateKey
    // await rotateKey(alice.address(), alice, bob); // address, fromAuth, toAuth

    console.log("\n=== Final Balances ===");
    await showBalances(alice, bob, charlie);

    // ** test tool 4 : checkKeyRotation
    console.log("\n=== Check Key Rotation ===");
    console.log('\nalice :');
    await checkKeyRotation(alice);
    console.log('\nbob :');
    await checkKeyRotation(bob);
    console.log('\ncharlie :');
    await checkKeyRotation(charlie);

  } catch (error) {
    console.log();
    console.log(error);
  }
})();

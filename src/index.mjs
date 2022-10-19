import * as api from './utils/api.mjs';
import { getAccounts } from './utils/account.mjs';
import { checkKeyRotation, rotateAuthKeyEd25519 } from './utils/keyRotation.mjs';
import { getAccountTransferPayload, getSignedTransaction } from './utils/tx.mjs';

async function transfer(authAccount, senderAddr, receiverAddr, amount) {

  const chainId = await api.getChainId();
  const { sequence } = await api.getSequenceAndAuthKey(senderAddr);
  const gasPrice = await api.getGasPrice();

  const tx = {
    sender: senderAddr.hexString,
    sequence,
    receiver: receiverAddr.hexString,
    amount,
    gasLimit: 2000,
    gasPrice,
    expiration: Math.floor(Date.now() / 1000) + 10,
    chainId,
  };
  console.log('\ntx :', tx);
  const publicKey = Buffer.from(authAccount.signingKey.publicKey).toString('hex');

  const gasLimit = await api.getGasLimit(tx, publicKey);
  console.log('gasLimit :', gasLimit);

  const payload = getAccountTransferPayload(receiverAddr, amount);
  const { signedTx } = getSignedTransaction({ ...tx, gasLimit }, payload, authAccount);
  return api.sendTx(signedTx);
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
    await api.fundAccount(alice.address(), 500000);

    console.log("\n=== Initial Balances ===");
    await showBalances(alice, bob, charlie);

    // ** test tool 2 : transfer
    const txId = await transfer(alice, alice.address(), bob.address(), 2000); // fromAuth, fromAddr, toAddr, amount
    console.log('txId :', txId);

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

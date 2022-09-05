import { AptosClient, FaucetClient } from "aptos";
import { getAccounts } from './utils/account.mjs';
import { checkKeyRotation, rotateAuthKeyEd25519 } from './utils/keyRotation.mjs';
import { getAccountTransferPayload, getSignedTransaction } from './utils/tx.mjs';

const NODE_URL = "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL = "https://faucet.devnet.aptoslabs.com";

const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

async function accountBalance(accountAddress) {
  try {
    const resource = await client.getAccountResource(accountAddress, "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
    if (resource == null) {
      return null;
    }
    return parseInt((resource.data)["coin"]["value"]);
  } catch (error) {
    return 'Not Exist';
  }
}

async function transfer(authAccount, senderAddr, receiverAddr, amount) {
  const chainId = await client.getChainId();
  const { sequence_number } = await client.getAccount(senderAddr);
  const payload = getAccountTransferPayload(receiverAddr, amount);
  const { signedTx } = getSignedTransaction(authAccount, senderAddr, sequence_number, chainId, payload);
  await sendTx(signedTx);
}

async function rotateKey(address, fromAccount, toAccount) {
  try {
    const chainId = await client.getChainId();
    const { signedTx } = await rotateAuthKeyEd25519(address, fromAccount, toAccount, chainId);
    await sendTx(signedTx);
  } catch (error) {
    console.log('\n*** Key Rotation Failure ***');
    console.log(error);
  }
}

async function sendTx(bcsTxn) {
  const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
  // console.log('\npendingTxn :', pendingTxn);
  await client.waitForTransaction(pendingTxn.hash);
}

async function showBalances(alice, bob, charlie) {
  console.log(`Alice   : ${await accountBalance(alice.address())}`);
  console.log(`Bob     : ${await accountBalance(bob.address())}`);
  console.log(`Charlie : ${await accountBalance(charlie.address())}`);
}

(async ()=>{
  try {
    const { alice, bob, charlie } = await getAccounts();

    // ** test tool 1 : faucet
    await faucetClient.fundAccount(alice.address(), 5000);

    console.log("\n=== Initial Balances ===");
    await showBalances(alice, bob, charlie);

    // ** test tool 2 : transfer
    await transfer(alice, alice.address(), bob.address(), 2000); // fromAuth, fromAddr, toAddr, amount

    // ** test tool 3 : rotateKey
    await rotateKey(alice.address(), alice, bob); // address, fromAuth, toAuth

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

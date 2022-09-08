import { AptosClient, FaucetClient } from 'aptos';
import { getAccounts } from './account.mjs';
import { getAccountTransferPayload, getSignedTransaction } from './tx.mjs';

const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

if (process.argv[1].includes('utils/api.mjs')) {
  try {
    const { alice, bob, charlie } = await getAccounts();

    const oriAuth = alice.authKey().hexString;
    console.log('\noriginalAuth :', oriAuth);
    const rotatedAddr = await lookupAddressByAuthKey(oriAuth);
    console.log('rotatedAddr  :', rotatedAddr);

    const { sequence, currentAuth } = await getSequenceAndAuthKey(oriAuth);
    console.log('currentAuth  :', currentAuth);
    console.log('\nsequence :', sequence);


    const balance = await accountBalance(oriAuth);
    console.log('balance  :', balance);

    const chainId = await getChainId();
    console.log('chainId  :', chainId);

    const gasPrice = await getGasPrice();
    console.log('gasPrice :', gasPrice);

    // Submit BCS Simulation : Create a SignedTransaction with a zero-padded signature.
    // https://fullnode.devnet.aptoslabs.com/v1/spec#/operations/simulate_transaction
    // https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/e2e-testsuite/src/tests/verify_txn.rs

    const auth = bob;
    const sender = alice.address();
    const receiver = bob.address();
    const amount = 1000;
    const gasLimit = '2000';

    const payload = getAccountTransferPayload(receiver, amount);
    const { signedTx } = getSignedTransaction(auth, sender, sequence, chainId, payload, gasLimit, gasPrice);
    let fakeSignedTx = Buffer.from(signedTx).toString('hex');
    fakeSignedTx = fakeSignedTx.slice(0,-128) + '0'.repeat(128);

    const usedGas = await getGasLimit(Buffer.from(fakeSignedTx,'hex'));
    console.log('usedGas :', usedGas);

    // History

    const history = await getHistory(oriAuth);
    console.log('history :', history.map(tx=>tx.payload.function));

  } catch (err) {
    console.log('err :', err);
  }
}

export async function fundAccount(address, amount) {
  return faucetClient.fundAccount(address, amount);
}

export async function accountBalance(address) {
  try {
    const resource = await client.getAccountResource(address, '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
    const { value } = resource.data.coin;
    return parseInt(value);
  } catch (error) {
    return 'Not Exist';
  }
}

export async function lookupAddressByAuthKey(authKey) {
  try {
    const resource = await client.getAccountResource('0x1', '0x1::account::OriginatingAddress');
    const { handle } = resource.data.address_map;
    const origAddress = await client.getTableItem(handle, {
      key_type: 'address',
      value_type: 'address',
      key: authKey,
    });
    return origAddress;
  } catch (error) {
    return '';
  }
}

export async function getSequenceAndAuthKey(address) {
  try {
    const {
      sequence_number: sequence,
      authentication_key: currentAuth,
    } = await client.getAccount(address);
    return { sequence, currentAuth };
  } catch (error) {
    return { sequence: null, currentAuth: '' };
  }
}

export async function getChainId() {
  return client.getChainId();
}

export async function getGasPrice() {
  const { gas_estimate } = await client.client.transactions.estimateGasPrice();
  return gas_estimate;
}

export async function getGasLimit(fakeSignedTx) {
  try {
    const res = await client.submitBCSSimulation(fakeSignedTx);
    const result = res[0];
    if (!result.success) throw new Error(result.vm_status);
    return result.gas_used;
  } catch (error) {
    return error.message;
  }
}

export async function getHistory(address) {
  const transactions = await client.client.transactions.getAccountTransactions(address);
  return transactions;
}

export async function sendTx(bcsTxn) {
  const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
  await client.waitForTransaction(pendingTxn.hash);
}

import { AptosClient, FaucetClient } from 'aptos';
import BigNumber from 'bignumber.js';
import { getAccounts } from './account.mjs';
import { getAccountTransferPayload, getSignedTransaction } from './tx.mjs';

export {
  fundAccount,
  accountBalance,
  lookupAddressByAuthKey,
  getSequenceAndAuthKey,
  getChainId,
  getGasPrice,
  getGasLimit,
  getHistory,
  sendTx,
};

const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

if (process.argv[1].includes('utils/api.mjs')) {
  try {
    const { alice, bob, charlie } = await getAccounts();

    const auth = bob;
    const sender = alice.address().hexString;
    const receiver = bob.address().hexString;

    await fundAccount(sender, 6000);

    const oriAuth = sender;
    console.log('\noriginalAuth :', oriAuth);
    const rotatedAddr = await lookupAddressByAuthKey(oriAuth);
    console.log('rotatedAddr  :', rotatedAddr);

    const { sequence, currentAuth } = await getSequenceAndAuthKey(oriAuth);
    console.log('currentAuth  :', currentAuth);
    console.log('\nsequence :', sequence);

    const balance = await accountBalance(oriAuth);
    console.log('balance  :', balance);

    if (!currentAuth) throw new Error('account does not exist');

    const chainId = await getChainId();
    console.log('chainId  :', chainId);

    const gasPrice = await getGasPrice();
    console.log('gasPrice :', gasPrice);

    // Submit BCS Simulation : Create a SignedTransaction with a zero-padded signature.
    // https://fullnode.devnet.aptoslabs.com/v1/spec#/operations/simulate_transaction
    // https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/src/aptos_client.ts#L360
    // https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/e2e-testsuite/src/tests/verify_txn.rs

    const publicKey = auth.pubKey().hexString;
    const testGasLimit = 2000;
    const tx = {
      sender,
      receiver,
      sequence,
      amount: 1000,
      gasLimit: testGasLimit,
      gasPrice,
      expiration: Math.floor(Date.now() / 1000) + 10,
    };
    const usedGas = await getGasLimit(tx, publicKey);
    console.log('usedGas  :', usedGas);

    // History

    const history = await getHistory(oriAuth);
    console.log('history  :', history.map(tx=>tx.payload.function));

  } catch (err) {
    console.log('\nError :', err.message);
  }
}

async function fundAccount(address, amount) {
  return faucetClient.fundAccount(address, amount);
}

async function accountBalance(address) {
  try {
    const resource = await client.getAccountResource(address, '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
    const { value } = resource.data.coin;
    return parseInt(value);
  } catch (error) {
    return 'Not Exist';
  }
}

async function lookupAddressByAuthKey(authKey) {
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

async function getSequenceAndAuthKey(address) {
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

async function getChainId() {
  return client.getChainId();
}

async function getGasPrice() {
  const { gas_estimate } = await client.client.transactions.estimateGasPrice();
  return gas_estimate;
}

// estimate gas

function remove0x(param) {
  if (!param) return '';
  const s = param.toLowerCase();
  return s.startsWith('0x') ? s.slice(2) : s;
}

function checkHex(param, length) {
  const hex = remove0x(param);
  const re = /^([0-9A-Fa-f]{2})+$/;
  const isHex = re.test(hex);
  const validLength = hex.length === length;
  if (!isHex) throw new Error('invalid hex format');
  if (!validLength) throw new Error(`invalid length, need ${length}, get ${hex.length}`);
  return hex;
}

function toUintArg(param, byteLen) {
  if (!param) {
    param = '0';
  }
  const bn = new BigNumber(param);
  const hex = bn.toString(16);
  const len = Math.ceil(hex.length / 2) * 2;
  return Buffer.from(hex.padStart(len, '0'),'hex').reverse().toString('hex').padEnd(byteLen * 2, '0');
}

function getSignedTx(tx, publicKey, sig) {
  const { sender, sequence, receiver, amount, gasLimit, gasPrice, expiration, chainId } = tx;

  let signedTx = '';
  signedTx += checkHex(sender, 64);
  signedTx += toUintArg(sequence, 8);
  signedTx += '02';
  signedTx += '0000000000000000000000000000000000000000000000000000000000000001';
  signedTx += '0d6170746f735f6163636f756e74';
  signedTx += '087472616e73666572';
  signedTx += '000220';
  signedTx += checkHex(receiver, 64);
  signedTx += '08';
  signedTx += toUintArg(amount, 8);
  signedTx += toUintArg(gasLimit, 8);
  signedTx += toUintArg(gasPrice, 8);
  signedTx += toUintArg(expiration, 8);
  signedTx += toUintArg(chainId, 1)
  signedTx += '0020';
  signedTx += checkHex(publicKey, 64);
  signedTx += '40';
  signedTx += sig ? checkHex(sig, 128) : '0'.repeat(128);
  return signedTx;
}

async function getGasLimit(tx, publicKey) {
  try {
    const fakeSignedTx = getSignedTx(tx, publicKey);
    const res = await client.submitBCSSimulation(Buffer.from(fakeSignedTx,'hex'));
    const result = res[0];
    if (!result.success) throw new Error(result.vm_status);
    return result.gas_used;
  } catch (error) {
    return error;
  }
}

async function getHistory(address) {
  const transactions = await client.client.transactions.getAccountTransactions(address);
  return transactions;
}

async function sendTx(bcsTxn) {
  const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
  await client.waitForTransaction(pendingTxn.hash);
  return pendingTxn.hash;
}

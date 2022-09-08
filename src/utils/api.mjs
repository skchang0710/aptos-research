import { AptosClient, FaucetClient } from "aptos";

const NODE_URL = "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL = "https://faucet.devnet.aptoslabs.com";

const client = new AptosClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

export async function fundAccount(address, amount) {
  return faucetClient.fundAccount(address, amount);
}

export async function accountBalance(address) {
  try {
    const resource = await client.getAccountResource(address, "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
    if (resource == null) {
      return null;
    }
    return parseInt((resource.data)["coin"]["value"]);
  } catch (error) {
    return 'Not Exist';
  }
}

export async function lookupAddressByAuthKey(authKey) {
  try {
    const resource = await client.getAccountResource('0x1', "0x1::account::OriginatingAddress");
    const { handle } = resource.data.address_map;
    const origAddress = await client.getTableItem(handle, {
      key_type: "address",
      value_type: "address",
      key: authKey,
    });
    return origAddress;
  } catch (error) {
    return '';
  }
}

export async function getAccount(address) {
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

export async function sendTx(bcsTxn) {
  const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
  await client.waitForTransaction(pendingTxn.hash);
}

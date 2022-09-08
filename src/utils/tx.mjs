// https://aptos.dev/tutorials/your-first-transaction/
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/src/aptos_client.ts
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/examples/typescript/bcs_transaction.ts
import { AptosClient, TxnBuilderTypes, BCS } from "aptos";
import { getAccounts } from './account.mjs';
import { format as rawTxFormat } from '../formatter/signingMessage.mjs';
import { format as signedTxFormat } from '../formatter/signedMessage.mjs';
import SHA3 from "js-sha3";
const { sha3_256 } = SHA3;

const RAW_TRANSACTION_SALT = "APTOS::RawTransaction";
const RAW_TRANSACTION_WITH_DATA_SALT = "APTOS::RawTransactionWithData";

if (process.argv[1].includes('utils/tx.mjs')) {
  try {
    const { alice, bob, charlie } = await getAccounts();

    const authAccount = alice;
    const senderAddr = bob.address();
    const receiverAddr = alice.address();
    const amount = 1000;
    const sequence = 0;
    const chainId = 25;

    const payload = getAccountTransferPayload(receiverAddr, amount);
    const { rawTx, signedTx } = getSignedTransaction(authAccount, senderAddr, sequence, chainId, payload);

    const rawTxHex = Buffer.from(BCS.bcsToBytes(rawTx)).toString('hex');
    const signedTxHex = Buffer.from(signedTx).toString('hex');

    // https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/src/transaction_builder/builder.ts#L67
    const prefixArray = new Uint8Array(sha3_256.create().update(RAW_TRANSACTION_SALT).arrayBuffer());
    const prefix = Buffer.from(prefixArray).toString('hex');
    console.log('\nrawTxHex :', rawTxHex);
    console.log(rawTxFormat(prefix+rawTxHex));

    console.log('\nsignedTxHex :', signedTxHex);
    console.log(signedTxFormat(signedTxHex));

  } catch (err) {
    console.log('err :', err);
  }
}

// -------- -------- -------- Coin Transfer Payload -------- -------- -------- //
//
// https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/framework/aptos-framework/sources/coin.move#L409
//
// {
//   "type": "entry_function_payload",
//   "function": "0x1::Coin::transfer",
//   "type_arguments": ["0x1::aptos_coin::AptosCoin"],
//   "arguments": [
//     "0x737b36c96926043794ed3a0b3eaaceaf",
//     "1000",
//   ]
// }

export function getCoinTransferPayload(receiverAddr, amount) {
  const token = new TxnBuilderTypes.TypeTagStruct(
    TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin")
  );
  console.log('\ntoken :', token);

  const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      "0x1::coin",
      "transfer",
      [token],
      [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(receiverAddr)), BCS.bcsSerializeUint64(amount)],
    ),
  );
  // console.log('\npayload :', payload);
  return payload;
}

// -------- -------- -------- Aptos Account Transfer Payload -------- -------- -------- //
//
// https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/framework/aptos-framework/sources/aptos_account.move#L18
//
// {
//   "type": "entry_function_payload",
//   "function": "0x1::AptosAccount::transfer",
//   "type_arguments": [],
//   "arguments": [
//     "0x737b36c96926043794ed3a0b3eaaceaf",
//     "1000",
//   ]
// }

export function getAccountTransferPayload(receiverAddr, amount) {
  const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      "0x1::aptos_account",
      "transfer",
      [],
      [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(receiverAddr)), BCS.bcsSerializeUint64(amount)],
    ),
  );
  // console.log('\npayload :', payload);
  return payload;
}

// -------- -------- -------- Construct Transaction -------- -------- -------- //

export function getSignedTransaction(authAccount, senderAddr, sequence, chainId, payload, gasLimit=1000, gasPrice=1) {
  const rawTx = new TxnBuilderTypes.RawTransaction(
    TxnBuilderTypes.AccountAddress.fromHex(senderAddr),
    BigInt(sequence),
    payload,
    gasLimit,
    gasPrice,
    BigInt(Math.floor(Date.now() / 1000) + 10), // expiration
    new TxnBuilderTypes.ChainId(chainId),       // chain id
  );
  const signedTx = AptosClient.generateBCSTransaction(authAccount, rawTx);
  return { rawTx, signedTx };
}

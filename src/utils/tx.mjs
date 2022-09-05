// https://aptos.dev/tutorials/your-first-transaction/
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/src/aptos_client.ts
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/examples/typescript/bcs_transaction.ts
import { AptosClient, TxnBuilderTypes, BCS } from "aptos";
import { getAccounts } from './account.mjs';
import { format } from '../formatter/signedMessage.mjs';

if (process.argv[1].includes('utils/tx.mjs')) {
  try {
    const { alice, bob, charlie } = await getAccounts();

    const authAccount = alice;
    const senderAddr = bob.address();
    const receiverAddr = alice.address();
    const amount = 1000;
    const sequence = 0;
    const chainId = 25;

    // const payload = getCoinTransferPayload(account_with_to_address, amount);
    const payload = getAccountTransferPayload(receiverAddr, amount);
    getSignedTransaction(authAccount, senderAddr, sequence, chainId, payload);

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
  console.log('\npayload :', payload);
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
  console.log('\npayload :', payload);
  return payload;
}

// -------- -------- -------- Construct Transaction -------- -------- -------- //

export function getSignedTransaction(authAccount, senderAddr, sequence, chainId, payload) {
  const rawTxn = new TxnBuilderTypes.RawTransaction(
    TxnBuilderTypes.AccountAddress.fromHex(senderAddr),
    BigInt(sequence),
    payload,
    1000n, // gas limit
    1n,    // gas price
    BigInt(Math.floor(Date.now() / 1000) + 10), // expiration
    new TxnBuilderTypes.ChainId(chainId),       // chain id
  );
  const bcsTxn = AptosClient.generateBCSTransaction(authAccount, rawTxn);
  const signedTx = Buffer.from(bcsTxn).toString('hex');
  console.log('signedTx :', signedTx);
  console.log(format(signedTx));
  return bcsTxn;
}

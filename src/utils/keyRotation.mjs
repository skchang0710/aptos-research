// https://github.com/aptos-labs/aptos-core/pull/3577/files
import { AptosAccount, AptosClient, TxnBuilderTypes, BCS } from "aptos";
import { getSignedTransaction } from './tx.mjs';
import { getAccounts } from './account.mjs';

const NODE_URL = "https://fullnode.devnet.aptoslabs.com";
const client = new AptosClient(NODE_URL);

if (process.argv[1].includes('utils/keyRotation.mjs')) {
  try {
    const { alice, bob, charlie } = await getAccounts();

    console.log('\ncheckKeyRotation :');
    console.log('\nalice :');
    await checkKeyRotation(alice);
    console.log('\nbob :');
    await checkKeyRotation(bob);
    console.log('\ncharlie :');
    await checkKeyRotation(charlie);

    // console.log('\nrotateAuthKeyEd25519 :\n');
    // await rotateAuthKeyEd25519(bob.address(), alice, bob);

  } catch (err) {
    console.log('err :', err);
  }
}

export async function checkKeyRotation(account) {
  const address = account.address();
  const originalAuth = address.hexString;
  const currentAuth = await getAuthKeyByAddress(address);
  const rotatedAddr = await lookupAddressByAuthKey(originalAuth);

  console.log('originalAuth :', originalAuth);
  console.log('currentAuth  :', currentAuth);
  console.log('rotatedAddr  :', rotatedAddr);

  // 前提 : 一個 AuthKey 能夠對應到最多兩個 Address，一是他原本自己的，二是別的帳號 Rotate 給它的。
  //
  // (0) currentAuth 不存在          : 此地址沒有做過 Create Account。
  // (1) originalAuth == currentAuth : 沒有做過 Key Rotation，此帳號的 AuthKey 可正常使用原本的 Address。
  // (2) originalAuth != currentAuth : 已經做過 Key Rotation，此帳號的 AuthKey 不能再使用原本的 Address。
  // (3) rotatedAddr 不存在          : 此帳號的 AuthKey 沒有 Rotate 給新的 Address。
  // (4) rotatedAddr 存在            : 此帳號的 AuthKey 已經 Rotate 給新的 Address。
  //
  // 狀況 :
  //
  // (0,2+3) 此 AuthKey 不能使用。
  // (1+3)   此 AuthKey 只能使用原本的 Address。
  // (2+4)   此 AuthKey 只能使用新的 Address。
  // (1+4)   此 AuthKey 能使用原本及新的兩個 Address。
  //
  // Bug? : 
  //
  // A B 帳號互相 rotate 以後，B 帳號 lookupAddressByAuthKey 會 Not Found，但確實能用 B AuthKey 做 A Address 的交易。

  const hasOldAddress = originalAuth === currentAuth;
  const hasNewAddress = rotatedAddr !== '';
  let result = '';
  if (!hasOldAddress && !hasNewAddress) result = '此 AuthKey 不能使用。';
  if (hasOldAddress && !hasNewAddress) result = '此 AuthKey 只能使用原本的 Address。';
  if (!hasOldAddress && hasNewAddress) result = '此 AuthKey 只能使用新的 Address。';
  if (hasOldAddress && hasNewAddress) result = '此 AuthKey 能使用原本及新的兩個 Address。';
  console.log('Result       :', result);
}

async function getAuthKeyByAddress(address) {
  try {
    const { authentication_key } = await client.getAccount(address);
    return authentication_key;
  } catch (error) {
    return '';
  }
}

async function lookupAddressByAuthKey(authKey) {
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

// -------- -------- -------- Rotate Auth Key Ed25519 -------- -------- -------- //
//
// https://github.com/aptos-labs/aptos-core/blob/main/aptos-move/framework/aptos-framework/sources/account.move#L197
// https://github.com/aptos-labs/aptos-core/pull/3577/files#diff-821112f883e29b9e6a3d25b95cb8a9f638dfd44930f51fd727a42aa2f0fdae6aR689

export async function rotateAuthKeyEd25519(address, fromAccount, toAccount) {
  const chainId = await client.getChainId();
  const { sequence_number, authentication_key } = await client.getAccount(address);

  if (fromAccount.authKey().hexString !== authentication_key) {
    throw new Error(`invalid authKey! should be : ${authentication_key}`);
  }

  let sequence = parseInt(sequence_number).toString(16);
  sequence = (sequence.length%2 ? '0' : '') + sequence;
  sequence = Buffer.from(sequence,'hex').reverse().toString('hex').padEnd(16,'0');

  const challengeHex =
    '0000000000000000000000000000000000000000000000000000000000000001' +
    '076163636f756e74' +
    '16526f746174696f6e50726f6f664368616c6c656e6765' +
    sequence +
    address.hexString.slice(2) +
    fromAccount.authKey().hexString.slice(2) +
    '20' + toAccount.pubKey().hexString.slice(2);

  // console.log('\nchallengeHex  :', challengeHex);

  const proofByFromAccount = fromAccount.signHexString(challengeHex);
  const proofByToAccount = toAccount.signHexString(challengeHex);

  const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      "0x1::account",
      "rotate_authentication_key_ed25519",
      [],
      [
        BCS.bcsSerializeBytes(proofByFromAccount.toUint8Array()),
        BCS.bcsSerializeBytes(proofByToAccount.toUint8Array()),
        BCS.bcsSerializeBytes(fromAccount.pubKey().toUint8Array()),
        BCS.bcsSerializeBytes(toAccount.pubKey().toUint8Array()),
      ],
    ),
  );

  return getSignedTransaction(fromAccount, address, sequence_number, chainId, payload);
}

/*

const challenge = new TxnBuilderTypes.RotationProofChallenge(
  TxnBuilderTypes.AccountAddress.CORE_CODE_ADDRESS,
  "account",
  "RotationProofChallenge",
  BigInt(sequenceNumber),
  TxnBuilderTypes.AccountAddress.fromHex(forAccount.address()),
  new TxnBuilderTypes.AccountAddress(Buffer.from(authKey.slice(2), 'hex')),
  helperAccount.pubKey().toUint8Array(),
);
const challengeHex = HexString.fromUint8Array(BCS.bcsToBytes(challenge));

serialize(serializer: Serializer): void {
  this.accountAddress.serialize(serializer);
  serializer.serializeStr(this.moduleName);
  serializer.serializeStr(this.structName);
  serializer.serializeU64(this.sequenceNumber);
  this.originator.serialize(serializer);
  this.currentAuthKey.serialize(serializer);
  serializer.serializeBytes(this.newPublicKey);
}

0000000000000000000000000000000000000000000000000000000000000001
076163636f756e74
16526f746174696f6e50726f6f664368616c6c656e6765
1700000000000000
22026ac3e7172d12b53b9c2fd4a6b219d00f15842a664d3eb831c5caca0da8ba
22026ac3e7172d12b53b9c2fd4a6b219d00f15842a664d3eb831c5caca0da8ba
20 c583ec60ad9b54c7c058e00832856809b76d0040d9a5dd2035f8714e64f43c62

*/

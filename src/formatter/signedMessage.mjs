/*

class SignedTransaction {
  constructor(public readonly raw_txn: RawTransaction, public readonly authenticator: TransactionAuthenticator) {}
  serialize(serializer: Serializer): void {
    this.raw_txn.serialize(serializer);
    this.authenticator.serialize(serializer);
  }

class RawTransaction {
  constructor(
    public readonly sender: AccountAddress,
    public readonly sequence_number: Uint64,
    public readonly payload: TransactionPayload,
    public readonly max_gas_amount: Uint64,
    public readonly gas_unit_price: Uint64,
    public readonly expiration_timestamp_secs: Uint64,
    public readonly chain_id: ChainId,
  ) {}
  serialize(serializer: Serializer): void {
    this.sender.serialize(serializer);
    serializer.serializeU64(this.sequence_number);
    this.payload.serialize(serializer);
    serializer.serializeU64(this.max_gas_amount);
    serializer.serializeU64(this.gas_unit_price);
    serializer.serializeU64(this.expiration_timestamp_secs);
    this.chain_id.serialize(serializer);
  }

class TransactionAuthenticatorEd25519 extends TransactionAuthenticator {
  constructor(public readonly public_key: Ed25519PublicKey, public readonly signature: Ed25519Signature) {
    super();
  }
  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(0);
    this.public_key.serialize(serializer);
    this.signature.serialize(serializer);
  }

class Ed25519PublicKey {
  static readonly LENGTH: number = 32;
  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.value);
  }

class Ed25519Signature {
  static readonly LENGTH = 64;
  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.value);
  }

*/

import { getAddress, getU64, getU8, getUleb128, getStrings, getBytes, getVarSeq, getTypeTag } from './bcs.mjs';

export function format(str) {
  const state = { str, result: '' };

  // **** Raw Transaction ****

  console.log('\n**** Raw Transaction ****\n');
  getAddress(state, 'sender');
  getU64(state, 'sequence');

  // payload
  getUleb128(state, 'payload');
  getAddress(state, 'module_address', 1);
  getStrings(state, 'module_name', 1);
  getStrings(state, 'function_name', 1);
  getVarSeq(state, getTypeTag, 'ty_args', 1);
  getVarSeq(state, getBytes, 'args', 1);

  getU64(state, 'max_gas');
  getU64(state, 'gas_price');
  getU64(state, 'expiration');
  getU8(state, 'chain_id');

  // **** Authenticator  ****

  console.log('\n**** Authenticator  ****\n');
  getUleb128(state, 'auth_type');
  getBytes(state, 0, 'public_key');
  getBytes(state, 0, 'signature');


  if (state.str) throw new Error('data exists :', state.str);
}

if (process.argv[1].includes('/formatter/signedMessage.mjs')) {

  let str = process.argv[2];
  if (!str) {
    str = '22026ac3e7172d12b53b9c2fd4a6b219d00f15842a664d3eb831c5caca0da8ba000000000000000003000000000000000000000000000000000000000000000000000000000000000104636f696e087472616e73666572010700000000000000000000000000000000000000000000000000000000000000010a6170746f735f636f696e094170746f73436f696e000220aede4fa834b2f2a6fc3f21b19cfe0fd48246a62c526b231d8bfbd60f1ae83f6508e803000000000000e8030000000000000100000000000000256a0d6300000000190020e096351bdc43f8bef3ddfb226daa443f2807ab96ee0e5bb99436cf61f6ad88894004468136ef37d3e48dcfb356ce80f9b8e8d80d5a3d52240d05fb73b8a23885502ad330dda07460a4f00a93f9d84bd087a17353f2ffe796070e446ad6dd0ae20b';
    console.log('\nexecute example :');
  }

  console.log(format(str));
}

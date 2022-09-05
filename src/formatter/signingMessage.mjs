/* https://aptos.dev/guides/creating-a-signed-transaction/#signing-message

signing_message = prefix_bytes | bcs_bytes_of_raw_transaction.

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
*/

import { getAddress, getFixedBytes, getU64, getU8, getUleb128, getStrings, getBytes, getVarSeq, getTypeTag } from './bcs.mjs';

export function format(str) {
  const state = { str, result: '' };

  // **** Prefix ****

  console.log('\n**** Prefix ****\n');
  getFixedBytes(state, 32, 'prefix');

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

  if (state.str) throw new Error('data exists');
}

if (process.argv[1].includes('formatter/signingMessage.mjs')) {

  let str = process.argv[2];
  if (!str) {
    str = 'b5e97db07fa0bd0e5598aa3643a9bc6f6693bddc1a9fec9e674a461eaa00b19322026ac3e7172d12b53b9c2fd4a6b219d00f15842a664d3eb831c5caca0da8ba000000000000000003000000000000000000000000000000000000000000000000000000000000000104636f696e087472616e73666572010700000000000000000000000000000000000000000000000000000000000000010a6170746f735f636f696e094170746f73436f696e000220aede4fa834b2f2a6fc3f21b19cfe0fd48246a62c526b231d8bfbd60f1ae83f6508e803000000000000e8030000000000000100000000000000d94300630000000018';
    console.log('\nexecute example :');
  }

  console.log(format(str));
}

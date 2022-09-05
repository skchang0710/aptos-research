/* https://github.com/diem/bcs#detailed-specifications

// ******** ******** ******** ******** ******** ******** ******** ******** //
//
// BCS is not a self-describing format.
// As such, in order to deserialize a message,
// one must know the message type and layout ahead of time.
//
// ******** ******** ******** ******** ******** ******** ******** ******** //

BCS supports the following data types:

Booleans
Signed 8-bit, 16-bit, 32-bit, 64-bit, and 128-bit integers
Unsigned 8-bit, 16-bit, 32-bit, 64-bit, and 128-bit integers
Option
Unit (an empty value)
Fixed and variable length sequences
UTF-8 Encoded Strings
Tuples
Structures (aka "structs")
Externally tagged enumerations (aka "enums")
Maps

ULEB128-Encoded Integers: used to represent unsigned 32-bit integers in two cases where small values are usually expected: (1) lengths of variable-length sequences and (2) tags of enum values (see the corresponding sections below).

*/

import BigNumber from 'bignumber.js';

const padSpace = 2;
const baseOffset = 10;

function print(title, content, offset=0) {
  console.log(title.padEnd((baseOffset+offset)*padSpace, ' '), content);
}

// APTOS Types

export function getAddress(state, title, offset) {
  getFixedBytes(state, 32, title, offset);
}

export function getFixedBytes(state, length, title, offset) {
  getBuffer(state, length);
  print(title, state.value, offset);
}

export function getBytes(state, offset, title='(Bytes)') {
  const { value: length, hex } = getUleb128(state);
  getBuffer(state, length);
  const info = `${hex} ${state.value}`;
  print(title, info, offset);
}

export function getTypeTag(state, offset) {
  const { value: type, hex } = getUleb128(state);
  if (type !== 7) throw new Error('not supported type');
  print('struct_tag', hex, offset);
  getStructTag(state, offset+1);
}

export function getStructTag(state, offset) {
  getAddress(state, 'address', offset);
  getStrings(state, 'module_name', offset);
  getStrings(state, 'name', offset);
  getVarSeq(state, getTypeTag, 'ty_args', offset);
}

// BCS Types

export function getStrings(state, title, offset) {
  const { value: length, hex: lenHex } = getUleb128(state);
  getBuffer(state, length);
  const value = Buffer.from(state.value, 'hex').toString();
  const info = `${lenHex} ${state.value} (${value})`;
  print(title, info, offset);
}

export function getVarSeq(state, func, title, offset=0) {
  const { value: length } = getUleb128(state, title, offset);
  getFixedSeq(length, state, func, offset);
}

export function getFixedSeq(length, state, func, offset) {
  for (let i = 0; i < length; i++) {
    func(state, offset+1);
  }
}

export function getUleb128(state, title, offset) {
  let value = '';
  let str = state.str;
	while (str.length > 0) {
    const byte = str.slice(0, 2);
    value += byte;
    str = str.slice(2);
    if (parseInt(byte, 16) < 128) break;
	}
  state.value = value;
  state.str = str;

	let input = parseInt(value, 16);
	let int = 0;
	while (input > 0) {
		const out = input & 127;
		int = int*128 + out;
		input = input >>> 8;
	}

  const info = `${state.value} (${int})`;
  if (title) print(title, info, offset);
  return { value: int, hex: state.value };
}

export function getU64(state, title, offset) {
  return getUint(64, state, title, offset);
}

export function getU32(state, title, offset) {
  return getUint(32, state, title, offset);
}

export function getU16(state, title, offset) {
  return getUint(16, state, title, offset);
}

export function getU8(state, title, offset) {
  return getUint(8, state, title, offset);
}

export function getUint(bits, state, title, offset) {
  getBuffer(state, bits/8);
  const value = BigNumber(Buffer.from(state.value, 'hex').reverse().toString('hex'), 16).toFixed();
  const info = `${state.value} (${value})`;
  print(title, info, offset);
  return { value, hex: state.value };
}

function getBuffer(state, length) {
  state.value = state.str.substr(0, length*2);
  state.str = state.str.substr(length*2);
}



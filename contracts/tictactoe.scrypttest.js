const { expect } = require('chai');
const { buildContractClass, compileContract } = require('scryptlib');
const path = require('path');
const {existsSync,mkdirSync } = require('fs');

function runCompile(fileName) {
  const filePath = path.join(__dirname, '..', 'contracts', fileName)
  const out = path.join(__dirname, '..', 'out')

  if(!existsSync(out)) {
    mkdirSync(out);
  }

  const result = compileContract(filePath, out);
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors)
    throw result.errors;
  }

  return result;
}

describe('Test sCrypt contract Tictactoe In Javascript', () => {
  let demo, result

  before(() => {
    const Tictactoe = buildContractClass(runCompile('tictactoe.scrypt'));
    demo = new Tictactoe();
  });

  it('should return true', () => {

  });

  it('should throw error', () => {

  });
});

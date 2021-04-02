const { expect } = require('chai');
const { buildContractClass, compileContract, Bytes, signTx, bsv, Sig, SigHashPreimage, PubKey, toHex, getPreimage, Ripemd160 } = require('scryptlib');
const path = require('path');
const { existsSync, mkdirSync } = require('fs');
const inputIndex = 0
const inputSatoshis = 100000

function newTx() {
  const utxo = {
    txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
    outputIndex: 0,
    script: '',   // placeholder
    satoshis: inputSatoshis
  };
  return new bsv.Transaction().from(utxo);
}

function runCompile(fileName) {
  const filePath = path.join(__dirname, '..', 'contracts', fileName)
  const out = path.join(__dirname, '..', 'out')

  if (!existsSync(out)) {
    mkdirSync(out);
  }

  const result = compileContract(filePath, out);
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors)
    throw result.errors;
  }

  return result;
}

const privateKeyAlice = new bsv.PrivateKey.fromRandom('testnet')
const publicKeyAlice = bsv.PublicKey.fromPrivateKey(privateKeyAlice)

const privateKeyBob = new bsv.PrivateKey.fromRandom('testnet')
const publicKeyBob = bsv.PublicKey.fromPrivateKey(privateKeyBob)

const Tictactoe = buildContractClass(runCompile('tictactoe.scrypt'));

game = new Tictactoe(new PubKey(toHex(publicKeyAlice)), new PubKey(toHex(publicKeyBob)));

let state = new Bytes('00000000000000000000').toASM();
game.setDataPart(state)

describe('Test sCrypt contract Tictactoe In Javascript', () => {
  let result, preimage, sig, prevLockingScript

  function moveScript(newState) {
    const state = new Bytes(newState).toASM();
    const newLockingScript = [game.codePart.toASM(), state].join(' ');
    return bsv.Script.fromASM(newLockingScript)
  }
  
  function testMove(isAliceTurn, n, outputScript) {
    const privateKey = isAliceTurn ? privateKeyAlice : privateKeyBob;
    prevLockingScript = game.lockingScript.toASM();

    const tx = newTx();

    tx.addOutput(new bsv.Transaction.Output({
      script: outputScript,
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(n, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;
  }

  it('One full round where Alice wins', () => {
    // Alice places an X at 0-th cell
    state = '01010000000000000000';
    testMove(true, 0, moveScript(state))
    game.setDataPart(state)
  
    // Bob places an O at 4-th cell
    state = '00010000000200000000';
    testMove(false, 4, moveScript(state))
    game.setDataPart(state)
  
    // Alice places an X at 1-th cell
    state = '01010100000200000000';
    testMove(true, 1, moveScript(state))
    game.setDataPart(state)
  
    // Bob places an O at 8-th cell
    state = '00010100000200000002';
    testMove(false, 8, moveScript(state))
    game.setDataPart(state)
  
    // Alice places an X at 2-th cell and wins
    testMove(true, 2, bsv.Script.buildPublicKeyHashOut(privateKeyAlice.toAddress()));
  });
});

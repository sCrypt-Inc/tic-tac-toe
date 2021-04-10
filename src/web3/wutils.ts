
import { toHex, bsv, SigHashPreimage, getPreimage as getPreimage_ } from 'scryptlib';
import { SignType, Tx, UTXO } from './wallet';


export function signInput(privateKey: any, tx: any, inputIndex: number, sigHashType: number, utxo: UTXO): string {

  tx.inputs[inputIndex].output = new bsv.Transaction.Output({
    script: utxo.script,
    satoshis: utxo.satoshis
  });

  const sig = new bsv.Transaction.Signature({
    publicKey: privateKey.publicKey,
    prevTxId: utxo.txHash,
    outputIndex: utxo.outputIndex,
    inputIndex,
    signature: bsv.Transaction.Sighash.sign(tx, privateKey, sigHashType,
      inputIndex,
      tx.inputs[inputIndex].output.script,
      tx.inputs[inputIndex].output.satoshisBN),
    sigtype: sigHashType,
  });

  return bsv.Script.buildPublicKeyHashIn(
    sig.publicKey,
    sig.signature.toDER(),
    sig.sigtype,
  ).toHex();
}




export function toBsvTx(tx: Tx) {
  const tx_ = new bsv.Transaction();

  tx.inputs.forEach(input => {
    tx_.addInput(new bsv.Transaction.Input({
      prevTxId: input.utxo.txHash,
      outputIndex: input.utxo.outputIndex,
      sequenceNumber: input.sequence,
      script: input.script ? bsv.Script.fromHex(input.script) : new bsv.Script(),
    }), bsv.Script.fromHex(input.utxo.script), input.utxo.satoshis);
  });


  tx.outputs.forEach(output => {
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromHex(output.script),
      satoshis: output.satoshis,
    }));
  });

  tx_.nLockTime = tx.nLockTime || 0;
  return tx_;
}

export function toRawTx(tx: Tx) {
  return toBsvTx(tx).toString();
}



export function getPreimage(tx: Tx, inputIndex = 0, sigHashType: SignType = SignType.ALL): SigHashPreimage {
  const bsvTx = toBsvTx(tx);
  return getPreimage_(bsvTx, bsv.Script.fromHex(tx.inputs[inputIndex].utxo.script).toASM(), tx.inputs[inputIndex].utxo.satoshis, inputIndex, sigHashType);
}

import { promises } from 'dns';
import { buildContractClass, buildTypeClasses, ScryptType, SigHashPreimage, bsv, getPreimage, toHex } from 'scryptlib';
import { } from 'scryptlib';
import { Output, UTXO, wallet, Tx, Input, SignType } from './wallet';
import axios from 'axios';
import { AbstractContract } from 'scryptlib/dist/contract';
import { toRawTx } from './wutils';
const WEB3_VERSION = '0.0.1';

const FEE = 2000;

export class web3 {


  static wallet: wallet;


  static setWallet(wallet: wallet) {
    web3.wallet = wallet;
  }


  static version() {
    return WEB3_VERSION;
  }


  static loadContract(url: string): Promise<{
    contractClass: typeof AbstractContract,
    types: Record<string, typeof ScryptType>
  }> {

    return axios.get(url, {
      timeout: 10000
    }).then(res => {

      return {
        contractClass: buildContractClass(res.data),
        types: buildTypeClasses(res.data)
      };
    });
  }



  static async buildDeployTx(contract: AbstractContract, amountInContract: number): Promise<Tx> {

    return web3.buildUnsignDeployTx(contract, amountInContract).then(async (tx: Tx) => {
      const sig = await web3.wallet.signRawTransaction(tx, 0, SignType.ALL);
      tx.inputs[0].script = sig;
      return tx;
    });
  }



  static async appendPayInput(tx: Tx, payAmount: number): Promise<Tx> {
    const changeAddress = await web3.wallet.getRawChangeAddress();

    return web3.wallet.listUnspent(payAmount + FEE, {
      purpose: 'change'
    }).then(async (utxos: UTXO[]) => {


      if (utxos.length === 0) {
        throw new Error('no utxos');
      }

      const inputIndex = tx.inputs.length;
      tx.inputs.push(
        {
          utxo: utxos[0],
          script: '',
          sequence: 0
        }
      );

      const changeAmount = utxos[0].satoshis - payAmount - FEE;
      tx.outputs.push(
        {
          script: bsv.Script.buildPublicKeyHashOut(changeAddress).toHex(),
          satoshis: changeAmount
        }
      );

      const sig = await web3.wallet.signRawTransaction(tx, inputIndex, SignType.ALL);
      tx.inputs[inputIndex].script = sig;
      return tx;
    });
  }



  static async buildUnsignDeployTx(contract: AbstractContract, amountInContract: number): Promise<Tx> {
    const changeAddress = await web3.wallet.getRawChangeAddress();
    return web3.wallet.listUnspent(amountInContract + FEE, {
      purpose: 'change'
    }).then(async (utxos: UTXO[]) => {
      if (utxos.length === 0) {
        throw new Error('no utxos');
      }

      const tx: Tx = {
        inputs: [],
        outputs: []
      };
      const input: Input = {
        utxo: utxos[0],
        sequence: 0,
        script: ''
      };

      tx.inputs.push(input);

      tx.outputs.push({
        script: contract.lockingScript.toHex(),
        satoshis: amountInContract
      });

      const changeAmount = utxos[0].satoshis - amountInContract - FEE;
      tx.outputs.push({
        script: bsv.Script.buildPublicKeyHashOut(changeAddress).toHex(),
        satoshis: changeAmount
      });

      return tx;
    });
  }


  static async sendRawTx(rawTx: string): Promise<string> {
    return web3.wallet.sendRawTransaction(rawTx);
  }

  static async sendTx(tx: Tx): Promise<string> {
    return web3.wallet.sendRawTransaction(toRawTx(tx));
  }


  static async deploy(contract: AbstractContract, amountInContract: number): Promise<string> {
    return web3.buildDeployTx(contract, amountInContract).then(async tx => {
      return web3.sendTx(tx);
    });
  }
}




console.log(`hello, this is scryptlib web3 ${WEB3_VERSION}.`);
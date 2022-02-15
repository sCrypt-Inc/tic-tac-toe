import { buildContractClass, buildTypeClasses, ScryptType, bsv } from 'scryptlib';
import { UTXO, wallet, Tx,  SignType } from './wallet';
import axios from 'axios';
import { AbstractContract } from 'scryptlib/dist/contract';
import {toRawTx } from './wutils';
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

    let wallet = web3.wallet

    let changeAddress = await web3.wallet.getRawChangeAddress();
    
    let publicKey = await web3.wallet.getPublicKey();

    const minAmount = amountInContract + FEE;

    return wallet.listUnspent(minAmount, {
      purpose: 'alice'
    }).then(async (utxos: UTXO[]) => {
      if (utxos.length === 0) {
        throw new Error('no utxos');
      }

      const tx: Tx = {
        inputs: [],
        outputs: []
      };

      tx.outputs.push({
        script: contract.lockingScript.toHex(),
        satoshis: amountInContract 
      });


      //add input which using utxo from alice
      tx.inputs.push(
        {
          utxo: utxos[0],
          script: '',
          sequence: 0
        }
      );

      const changeAmount = utxos[0].satoshis - amountInContract - FEE;

      if (changeAmount <= 0) {
        throw new Error('fund is not enough');
      }

      //add alice change output
      const script = bsv.Script.buildPublicKeyHashOut(changeAddress).toHex();
      tx.outputs.push(
        {
          script: script,
          satoshis: changeAmount
        }
      );

      return tx;
    }).then((tx) => {
      const utxo = tx.inputs[0].utxo;
      return wallet.getSignature(toRawTx(tx), 0, utxo.satoshis, utxo.script, SignType.ALL,changeAddress).then(signature => {
        console.log('getSignature', signature, publicKey)
        const script = new bsv.Script()
        .add(Buffer.from(signature,'hex'))
        .add(new bsv.PublicKey(publicKey).toBuffer())
        .toHex()
        tx.inputs[0].script = script;
        return tx;
      })
    })
  }



  static async sendRawTx(rawTx: string): Promise<string> {
    return web3.wallet.sendRawTransaction(rawTx);
  }

  static async sendTx(tx: Tx): Promise<string> {
    return web3.wallet.sendRawTransaction(toRawTx(tx));
  }

  static async deploy(contract: AbstractContract, amountInContract: number): Promise<[Tx, string]> {
    return web3.buildDeployTx(contract, amountInContract).then(async tx => {
      return web3.sendTx(tx).then(txid => {
        return [tx, txid];
      })
    });
  }
}
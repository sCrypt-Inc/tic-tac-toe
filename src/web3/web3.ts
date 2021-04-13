import { promises } from 'dns';
import { buildContractClass, buildTypeClasses, ScryptType, SigHashPreimage, bsv, getPreimage, toHex } from 'scryptlib';
import { } from 'scryptlib';
import { Output, UTXO, wallet, Tx, Input, SignType, NetWork } from './wallet';
import axios from 'axios';
import { AbstractContract } from 'scryptlib/dist/contract';
import { toRawTx } from './wutils';
import { LocalWallet } from './localwallet';
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



  static async buildDeployTx(contract: AbstractContract, amountInContract: number, alicePrivateKey: string, bobPrivateKey: string): Promise<Tx> {

    let aliceWallet = new LocalWallet(NetWork.Mainnet, alicePrivateKey);
    let bobWallet = new LocalWallet(NetWork.Mainnet, bobPrivateKey);

    const aliceChangeAddress = await aliceWallet.getRawChangeAddress();
    const bobChangeAddress = await bobWallet.getRawChangeAddress();

    const tx: Tx = {
      inputs: [],
      outputs: []
    };

    tx.outputs.push({
      script: contract.lockingScript.toHex(),
      satoshis: amountInContract * 2
    });

    const minAmount = amountInContract + FEE;

    return aliceWallet.listUnspent(minAmount, {
      purpose: 'change'
    }).then(async (utxos: UTXO[]) => {

      if (utxos.length === 0) {
        throw new Error('no utxos');
      }

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

      tx.outputs.push(
        {
          script: bsv.Script.buildPublicKeyHashOut(aliceChangeAddress).toHex(),
          satoshis: changeAmount
        }
      );

      return tx;
    }).then(tx => {
      return bobWallet.listUnspent(minAmount, {
        purpose: 'change'
      }).then(async (utxos: UTXO[]) => {

        if (utxos.length === 0) {
          throw new Error('no utxos');
        }

        //add input which using utxo from bob
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

        //add bob change output
        tx.outputs.push(
          {
            script: bsv.Script.buildPublicKeyHashOut(bobChangeAddress).toHex(),
            satoshis: changeAmount
          }
        );

        return tx;

      })
    }).then(tx => {
      //alice sign
      return aliceWallet.signRawTransaction(tx, 0, SignType.ALL).then(unlockscript => {
        tx.inputs[0].script = unlockscript;
        return tx;
      })
    }).then(tx => {
      //bob sign
      return bobWallet.signRawTransaction(tx, 1, SignType.ALL).then(unlockscript => {
        tx.inputs[1].script = unlockscript;
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


  static async deploy(contract: AbstractContract, amountInContract: number, alicePrivateKey: string, bobPrivateKey: string): Promise<[Tx, string]> {
    return web3.buildDeployTx(contract, amountInContract, alicePrivateKey, bobPrivateKey).then(async tx => {
      return web3.sendTx(tx).then(txid => {
        return [tx, txid];
      })
    });
  }
}
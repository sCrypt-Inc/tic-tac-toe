import { promises } from 'dns';
import { buildContractClass, buildTypeClasses, ScryptType, SigHashPreimage, bsv, getPreimage, toHex } from 'scryptlib';
import { Output, UTXO, wallet, Tx, Input, SignType, NetWork } from './wallet';
import axios from 'axios';
import { AbstractContract } from 'scryptlib/dist/contract';
import { toBsvTx, toRawTx } from './wutils';
import { LocalWallet } from './localwallet';
import { DotWallet } from './dotwallet';
import { DotWalletAddress, DotWalletPublicKey } from '../utils';
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

    let aliceWallet = new LocalWallet(NetWork.Regtest, alicePrivateKey);
    let bobWallet = new LocalWallet(NetWork.Regtest, bobPrivateKey);

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
      // debugger;
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
      // debugger;
      //alice sign
      return aliceWallet.signRawTransaction(tx, 0, SignType.ALL).then(unlockscript => {
        tx.inputs[0].script = unlockscript;
        return tx;
      })
    }).then(tx => {
      // debugger;
      //bob sign
      return bobWallet.signRawTransaction(tx, 1, SignType.ALL).then(unlockscript => {
        tx.inputs[1].script = unlockscript;
        return tx;
      })
    })
  }

  
  static async buildDeployTxV2(contract: AbstractContract, amountInContract: number): Promise<Tx> {

    let aliceWallet = new DotWallet();
    let bobWallet = new DotWallet();

    let aliceChangeAddress = '';
    let bobChangeAddress = '';
    
    let alicePublicKey = '';
    let bobPublicKey = '';

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
      purpose: 'alice'
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
      aliceChangeAddress = utxos[0].addr;
      alicePublicKey = utxos[0].pubkey;

      DotWalletPublicKey.set(alicePublicKey,'alice');
      DotWalletAddress.set(aliceChangeAddress,'alice');
      // debugger;
      const changeAmount = utxos[0].satoshis - amountInContract - FEE;

      if (changeAmount <= 0) {
        throw new Error('fund is not enough');
      }

      //add alice change output
      const script = bsv.Script.buildPublicKeyHashOut(aliceChangeAddress).toHex();
      tx.outputs.push(
        {
          script: script,
          satoshis: changeAmount
        }
      );
      // debugger;
      return tx;
    }).then(tx => {
      return bobWallet.listUnspent(minAmount, {
        purpose: 'bob'
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
        bobChangeAddress = utxos[0].addr;
        bobPublicKey = utxos[0].pubkey;

        DotWalletPublicKey.set(bobPublicKey,'bob');
        DotWalletAddress.set(bobChangeAddress,'bob');
        // debugger;
        const changeAmount = utxos[0].satoshis - amountInContract - FEE;
      
        if (changeAmount <= 0) {
          throw new Error('fund is not enough');
        }

        //add bob change output
        const script = bsv.Script.buildPublicKeyHashOut(bobChangeAddress).toHex();
        tx.outputs.push(
          {
            script:script,
            satoshis: changeAmount
          }
        );
        // console.log(toRawTx(tx));
        // debugger;
        return tx;
      })
    }).then((tx) => {
      // console.log(toRawTx(tx));
      // debugger;
      //alice sign
      // return aliceWallet.signRawTransactionV2(toRawTx(tx), 0, SignType.ALL,aliceChangeAddress,'alice').then(rawtx => {
      //   // (window as any).bsv = bsv
      //   // debugger;
      //   const transaction = bsv.Transaction(rawtx)
      //   const script = transaction.inputs[0].script;
      //   const hex = script.toHex();
      //   debugger;
      //   tx.inputs[0].script = hex;
      //   return tx;
      // })
      // return aliceWallet.getSignatureV2(toRawTx(tx), 0, SignType.ALL,aliceChangeAddress,'alice').then(rawtx => {
      //   // (window as any).bsv = bsv
      //   debugger;
      //   const transaction = bsv.Transaction(rawtx)
      //   const script = transaction.inputs[0].script;
      //   const hex = script.toHex();
      //   tx.inputs[0].script = hex;
      //   return tx;
      // })
      return aliceWallet.getSignatureV2(toRawTx(tx), 0, SignType.ALL,aliceChangeAddress,'alice').then(signature => {
          (window as any).bsv = bsv
        const script = new bsv.Script()
        .add(Buffer.from(signature,'hex'))
        // .add(Buffer.from([SignType.ALL]))
        .add(new bsv.PublicKey(alicePublicKey).toBuffer())
        .toHex()

        // const script = bsv.Script.buildPublicKeyHashIn(
        //   new bsv.PublicKey(alicePublicKey),
        //   bsv.crypto.Signature.fromString(signature),
        //   SignType.ALL,
        // ).toHex();

        // debugger;
        tx.inputs[0].script = script;
        return tx;
      })
    }).then(tx => {
      // debugger;
      //bob sign
      // return bobWallet.signRawTransactionV2(toRawTx(tx), 1, SignType.ALL,bobChangeAddress,'bob').then(rawtx => {
      //   const transaction = bsv.Transaction(rawtx)
      //   const script = transaction.inputs[1].script;
      //   const hex = script.toHex();
      //   debugger;
      //   tx.inputs[1].script = hex;
      //   // debugger;
      //   return tx;
      // })
      // return bobWallet.getSignatureV2(toRawTx(tx), 1, SignType.ALL,bobChangeAddress,'bob').then(rawtx => {
      //   debugger;
      //   const transaction = bsv.Transaction(rawtx)
      //   const script = transaction.inputs[1].script;
      //   const hex = script.toHex();
      //   tx.inputs[1].script = hex;
      //   // debugger;
      //   return tx;
      // })
      return bobWallet.getSignatureV2(toRawTx(tx), 1, SignType.ALL,bobChangeAddress,'bob').then(signature => {
        const script = new bsv.Script()
        .add(Buffer.from(signature,'hex'))
        // .add(Buffer.from([SignType.ALL]))
        .add(new bsv.PublicKey(bobPublicKey).toBuffer())
        .toHex()

        tx.inputs[1].script = script;
        // debugger;
        return tx;
      })
    })
  }

  static async setAllPublicKey(amountInContract: number): Promise<void> {

    let aliceWallet = new DotWallet();
    let bobWallet = new DotWallet();

    let aliceChangeAddress = '';
    let bobChangeAddress = '';
    
    let alicePublicKey = '';
    let bobPublicKey = '';

    const minAmount = amountInContract + FEE;

    return aliceWallet.listUnspent(minAmount, {
      purpose: 'alice'
    }).then(async (utxos: UTXO[]) => {

      if (utxos.length === 0) {
        throw new Error('no utxos');
      }
    
      aliceChangeAddress = utxos[0].addr;
      alicePublicKey = utxos[0].pubkey;

      DotWalletPublicKey.set(alicePublicKey,'alice');
      DotWalletAddress.set(aliceChangeAddress,'alice');
      // debugger;
      const changeAmount = utxos[0].satoshis - amountInContract - FEE;

      if (changeAmount <= 0) {
        throw new Error('fund is not enough');
      }

    }).then(tx => {
      return bobWallet.listUnspent(minAmount, {
        purpose: 'bob'
      }).then(async (utxos: UTXO[]) => {

        if (utxos.length === 0) {
          throw new Error('no utxos');
        }

        bobChangeAddress = utxos[0].addr;
        bobPublicKey = utxos[0].pubkey;

        DotWalletPublicKey.set(bobPublicKey,'bob');
        DotWalletAddress.set(bobChangeAddress,'bob');
        // debugger;
        const changeAmount = utxos[0].satoshis - amountInContract - FEE;
      
        if (changeAmount <= 0) {
          throw new Error('fund is not enough');
        }


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
        // debugger;
        return [tx, txid];
      })
    });
  }

  static async deployV2(contract: AbstractContract, amountInContract: number): Promise<[Tx, string]> {
    return web3.buildDeployTxV2(contract, amountInContract).then(async tx => {
      // debugger;
      return web3.sendTx(tx).then(txid => {
        return [tx, txid];
      })
    });
  }
}
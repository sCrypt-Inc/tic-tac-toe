import { Account, NetWork, UTXO, wallet, Tx, SignType } from './wallet';
import { toHex, bsv, signTx } from 'scryptlib';
import { signInput, toBsvTx } from './wutils';
import axios from 'axios';


export class LocalWallet extends wallet {
  API_PREFIX: string;
  privKey: any;
  constructor(network: NetWork, key: string) {
    super(network);
    this.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${network == NetWork.Testnet ? 'test' : 'main'}`;
    this.privKey = key ? new bsv.PrivateKey.fromWIF(key) : new bsv.PrivateKey.fromRandom(network);
  }


  requestAccount(name: string, permissions: string[]): Promise<Account> {
    throw new Error('Method not implemented.');
  }

  async getbalance(): Promise<number> {

    const {
      data: balance
    } = await axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/balance`, {
      timeout: 5000
    });

    return balance.confirmed + balance.unconfirmed;
  }

  async signRawTransaction(rawtx: string,
    inputIndex: number,
    sigHashType: SignType,
    addr: string
  ): Promise<string> {


    let tx_ = new bsv.Transaction(rawtx);

    const utxo = tx_.inputs[inputIndex].utxo;

    return signInput(this.privKey, tx_, inputIndex, sigHashType, utxo);
  }


  async getSignature(rawtx: string,
    inputIndex: number,
    sigHashType: SignType,
    addr: string): Promise<string> {

    let tx_ = new bsv.Transaction(rawtx);

    return signTx(tx_, this.privKey, tx_.inputs[inputIndex].output.script.toASM(), tx_.inputs[inputIndex].output.satoshisBN, inputIndex, sigHashType);

  }

  async sendRawTransaction(rawTx: string): Promise<string> {

    // 1 second per KB

    const size = Math.max(1, rawTx.length / 2 / 1024); //KB
    const time = Math.max(10000, 1000 * size);
    const {
      data: txid
    } = await axios.post(`${this.API_PREFIX}/tx/raw`, {
      txhex: rawTx
    }, {
      timeout: time
    });
    return txid;
  }

  async listUnspent(minAmount: number, options?: { purpose?: string; }): Promise<UTXO[]> {
    return axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/unspent`, {
      timeout: 10000
    }).then(res => {
      return res.data.filter((utxo: any) => utxo.value >= minAmount).map((utxo: any) => {
        return {
          txHash: utxo.tx_hash,
          outputIndex: utxo.tx_pos,
          satoshis: utxo.value,
          script: bsv.Script.buildPublicKeyHashOut(this.privKey.toAddress()).toHex(),
        } as UTXO;
      });
    });
  }


  getRawChangeAddress(options?: { purpose?: string; }): Promise<string> {

    return new Promise(resolve => resolve(this.privKey.toAddress() + ''));
  }


  getPublicKey(options?: { purpose?: string; }): Promise<string> {

    return new Promise(resolve => resolve(toHex(this.privKey.publicKey)));
  }

}
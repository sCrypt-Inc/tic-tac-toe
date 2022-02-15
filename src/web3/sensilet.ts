import { NetWork, UTXO, wallet, Tx, SignType } from './wallet';
import axios from 'axios';
import { bsv } from 'scryptlib/dist';


export class Sensilet extends wallet {
  static DEBUG_TAG = 'Sensilet';
  API_PREFIX: string;
  sensilet: any;

  constructor(network: NetWork = NetWork.Mainnet) {
    super(network);
    this.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${network == NetWork.Testnet ? 'test' : 'main'}`;
    if (typeof (window as any).sensilet !== 'undefined') {
      console.log('Sensilet is installed!');
      this.sensilet = (window as any).sensilet 
    } else {
      console.warn("sensilet is not installed");
    }
  }

  requestAccount(name: string, permissions: string[]): Promise<any> {

    if(!this.sensilet) {
      if(typeof (window as any).sensilet === 'undefined') {
        alert("sensilet is not installed");
         window.open("https://sensilet.com/", '_blank');
      } else  {
        console.log('Sensilet is installed!');
        this.sensilet = (window as any).sensilet 
        return this.sensilet.requestAccount()
      }
    }

    return this.sensilet.requestAccount()
  }

  async isConnect(): Promise<boolean> {
    try {
      console.log('isConnect')
      if (typeof this.sensilet !== 'undefined') {
        let isConnected = await this.sensilet.isConnect();
        console.log('connect state', isConnected);
        return isConnected;
      } 

    } catch (error) {
    
    }
    return Promise.resolve(false);
  }


  async getbalance(): Promise<number> {
    try {
      let res = await this.sensilet.getBsvBalance();
      console.log(Sensilet.DEBUG_TAG, 'getbalance', res.balance)
      return Promise.resolve(res.balance.total);
    } catch (error) {
      console.error('getbalance error', error);
    }

    return Promise.resolve(0)
  }

  async signRawTransaction(rawtx: string,
    inputIndex: number,
    sigHashType: SignType,
    addr: string
  ): Promise<string> {
    console.log('signRawTransaction', rawtx)
    const tx = new bsv.Transaction(rawtx);
    let res = await this.sensilet.signTx({
      list:[
        {
          txHex: rawtx,
          address: addr,
          inputIndex:inputIndex,
          satoshis:tx.inputs[inputIndex].satoshis
        }
      ]
    });
    console.log(res)

    return Promise.resolve(res.sigList[0].sig);
  }



  async getSignature(rawtx: string,
    inputIndex: number,
    inputAmount: number,
    inputScript: string, 
    sigHashType: SignType,
    addr: string
  ): Promise<string> {

    let res = await this.sensilet.signTx({
      list:[
        {
          txHex: rawtx,
          address: addr,
          inputIndex:inputIndex,
          satoshis:inputAmount,
          scriptHex: inputScript,
          sigtype: sigHashType
        }
      ]
    });

    return res.sigList[0].sig;
  }

  async sendRawTransaction(rawTx: string): Promise<string> {
    // 1 second per KB
    const size = Math.max(1, rawTx.length / 2 / 1024); //KB
    const time = Math.max(10000, 1000 * size);

    try {
      const res = await axios.post(`${this.API_PREFIX}/tx/raw`, {
        txhex: rawTx
      }, {
        timeout: time
      });
      return res.data;
    } catch (error) {
      throw new Error('sendRawTransaction error: ')
    }

  }

  async listUnspent(minAmount: number, options?: { purpose?: string; }): Promise<UTXO[]> {

    let address = await this.sensilet.getAddress();
    console.log(Sensilet.DEBUG_TAG, 'listUnspent', address)
    return axios.get(`${this.API_PREFIX}/address/${address}/unspent`, {
      timeout: 10000
    }).then(res => {
      return res.data.filter((utxo: any) => utxo.value >= minAmount).map((utxo: any) => {
        return {
          txHash: utxo.tx_hash,
          outputIndex: utxo.tx_pos,
          satoshis: utxo.value,
          script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
        } as UTXO;
      });
    });
  }


  async getRawChangeAddress(options?: { purpose?: string; }): Promise<string> {
    return this.sensilet.getAddress();
  }


  async getPublicKey(options?: { purpose?: string; }): Promise<string> {
    return this.sensilet.getPublicKey();
  }

  async exitAccount(): Promise<boolean> {
    try {
      await this.sensilet.exitAccount();
      return true
   } catch (e) {
     console.log(e);
   }
   return false;
  }
}
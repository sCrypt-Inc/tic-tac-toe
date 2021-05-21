import { Account, NetWork, UTXO, wallet, Tx, SignType } from './wallet';
import { toHex, bsv, signTx } from 'scryptlib';
import { signInput, toBsvTx } from './wutils';
import axios from 'axios';
import { DAPP_API_PATHS, getPlayer, getPlayerByState, LocalStorageKey } from '../utils';
import Request from '../Request';


export class DotWallet extends wallet {
  API_PREFIX: string;
  API_DOTWALLET: string;
  CLIENT_ID = 'aa7f349975c72e5ba3178e636728f6b2';
  loginUrl: string;
  privKey: any;
  sender: any;

  constructor(network: NetWork = NetWork.Mainnet) {
    super(network);
    this.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${network == NetWork.Regtest ? 'test' : 'main'}`;
    // this.API_DOTWALLET = network == NetWork.Regtest ?  `http://192.168.1.13:6001` : `https://api.ddpurse.com`;
    this.API_DOTWALLET = network == NetWork.Regtest ? `http://192.168.1.13:6001` : `https://api.ddpurse.com`;
    const loginUrl = `${this.API_DOTWALLET}/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(window.origin)}&response_type=code&scope=${encodeURIComponent("user.info")}`;
    this.loginUrl = loginUrl;
    this.sender = network == NetWork.Regtest ? {
      "appid": "test_bsv_coin_regular",
      "user_index": 0
    } : {
      "appid": "bsv_coin_regular",
      "user_index": 0
    }

    // this.privKey = key ? new bsv.PrivateKey.fromWIF(key) : new bsv.PrivateKey.fromRandom(network);
  }

  requestAccount(name: string, permissions: string[]): Promise<Account> {
    throw new Error('Method not implemented.');
  }

  auth() {
    // alice: "cVcptq2P6vT9yHsBNiZfr2kGSHoePGnKGXMjUiCPttoLXNTRQL2w"
    // bob: "cUjceB1UQ7SBqhSXRYGk8tZe1N3jpsbqKHRkmCXx4bm4qdL1muDb"
    window.location.href = `${this.loginUrl}&state=${getPlayer()}`;
  }

  code2token = async (code: string) => {
    if (!code) return;
    try {
      const { data } = await axios.post(`https://common.mempool.com/api/dotwallet/get_access_token`, {
        code,
        redirect_uri: window.location.origin
      });
      const { access_token } = data.data;
      if (access_token) {
        localStorage[`access_token_${getPlayerByState()}`] = access_token;
        const query = getPlayerByState() == 'alice' ? "?player=alice" : "?player=bob";
        window.location.href = `${window.location.origin}${query}`
      }
    } catch (error) {
      window.location.href = window.location.origin
    }
  };

  async getbalance(): Promise<number> {
    try {
      const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_get_balance}`, {
        "sender": this.sender,
      });
      return data.data.confirm + data.data.unconfirm;
    } catch (error) {
      return 0;
    }
  }

  async signRawTransactionV2(rawtx: String,
    inputIndex: number,
    sigHashType: SignType,
    addr: String,
    player: String,
  ): Promise<string> {
    // const tx_ = toBsvTx(tx);

    // const utxo = tx.inputs[inputIndex].utxo;

    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_sign_raw_transaction}`, {
      "sender": this.sender,
      "input_index": inputIndex,
      "sig_type": sigHashType,
      rawtx,
      addr,
    }, {
      headers: {
        "player": player
      }
    }
    );
    return data.data.signed_rawtx
  }



  async getSignatureV2(rawtx: String,
    inputIndex: number,
    sigHashType: SignType,
    addr: String,
    player: String,
  ): Promise<string> {
    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_get_signature}`, {
      "sender": this.sender,
      "input_index": inputIndex,
      "sig_type": sigHashType,
      rawtx,
      addr,
    }, {
      headers: {
        "player": player
      }
    });

    return data.data.hex_signature
  }

  async sendRawTransaction(rawTx: string): Promise<string> {

    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_send_raw_transaction}`, {
      "sender": this.sender,
      rawTx,
    });

    return data.data.txid;
  }

  async listUnspent(minAmount: number, options?: { purpose?: string; }): Promise<UTXO[]> {
    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_list_unspent}`, {
      "sender": this.sender,
      "min_amount": minAmount
    }, {
      headers: {
        "player": options?.purpose
      }
    });

    return data.data.utxos.filter((utxo: any) => utxo.satoshis >= minAmount).map((utxo: any) => {
      const _utxo = {
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        satoshis: utxo.satoshis,
        script: utxo.script,
        addr: utxo.addr,
        pubkey: utxo.pubkey,
      } as UTXO;
      // console.log(_utxo);
      // debugger;
      return _utxo;
    });
  }


  async getRawChangeAddress(options?: { purpose?: string; }): Promise<string> {
    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_get_raw_change_address}`, {
      "sender": this.sender,
    }, {
      headers: {
        "player": options?.purpose
      }
    });

    return data.data.address;
  }


  async getPublicKey(options?: { purpose?: string; }): Promise<string> {
    const { data } = await Request.post(`${this.API_DOTWALLET}${DAPP_API_PATHS.dapp_get_public_key}`, {
      "sender": this.sender,
    }, {
      headers: {
        "player": options?.purpose
      }
    });

    return data.data.public_key;
  }



  async getSignature(tx: Tx,
    inputIndex: number,
    sigHashType: SignType
  ): Promise<string> {


    const tx_ = toBsvTx(tx);
    // TODO
    return signTx(tx_, this.privKey, tx_.inputs[inputIndex].output.script.toASM(), tx_.inputs[inputIndex].output.satoshisBN, inputIndex, sigHashType);
  }

  async signRawTransaction(tx: Tx,
    inputIndex: number,
    sigHashType: SignType
  ): Promise<string> {


    const tx_ = toBsvTx(tx);

    const utxo = tx.inputs[inputIndex].utxo;

    return signInput(this.privKey, tx_, inputIndex, sigHashType, utxo);
  }
}
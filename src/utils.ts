import axios from 'axios';
import { ContractArtifact } from 'scryptlib/dist/contract';
import { TransformInfo } from 'scrypt-ts/dist/transformation/transpiler';
export class Utils {
  static API_PREFIX = ``;
  static TX_URL_PREFIX = ``;

  static setNetwork(testnet: boolean) {
    Utils.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${testnet ? 'test' : 'main'}`;
    Utils.TX_URL_PREFIX = `${testnet ? 'https://test.whatsonchain.com/tx' : 'https://whatsonchain.com/tx'}`;
  }

  static getTxUri(txid: string): string {
    return `${Utils.TX_URL_PREFIX}/${txid}`;
  }

  static loadContractArtifact(url: string): Promise<ContractArtifact> {
    return axios.get(url, {
      timeout: 10000
    }).then(res => {
      return res.data;
    });
  }

  static loadTransformInfo(url: string): Promise<TransformInfo> {
    return axios.get(url, {
      timeout: 10000
    }).then(res => {
      return res.data;
    });
  }
}
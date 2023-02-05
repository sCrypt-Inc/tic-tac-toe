export class Utils {
  static TX_URL_PREFIX = `https://test.whatsonchain.com/tx`;
  static getTxUri(txid: string): string {
    return `${Utils.TX_URL_PREFIX}/${txid}`;
  }
}
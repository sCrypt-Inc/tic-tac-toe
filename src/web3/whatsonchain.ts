import axios from 'axios';
export default class Whatsonchain {
    static API_PREFIX = `https://api.whatsonchain.com/v1/bsv/main`;

    static async sendRawTransaction(rawTx: string): Promise<string> {
        // 1 second per KB
        const size = Math.max(1, rawTx.length / 2 / 1024); //KB
        const time = Math.max(10000, 1000 * size);

        try {
            const res = await axios.post(`${Whatsonchain.API_PREFIX}/tx/raw`, {
                txhex: rawTx
            }, {
                timeout: time
            });
            return res.data;
        } catch (error) {
            throw new Error('sendRawTransaction error: ')
        }

    }

    static async listUnspent(address: string): Promise<any> {
        return axios.get(`${Whatsonchain.API_PREFIX}/address/${address}/unspent`, {
            timeout: 10000
        });
    }
}

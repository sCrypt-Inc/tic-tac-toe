import { FixedArray } from "scrypt-ts";
import { ContractState, GameData, SquareData } from "./types";

export class Utils {
  static TX_URL_PREFIX = `https://test.whatsonchain.com/tx`;
  static getTxUri(txid: string): string {
    return `${Utils.TX_URL_PREFIX}/${txid}`;
  }


  // Convert game data to contract state
  static toContractState = (data: GameData) : ContractState => {
    const history = data.history.slice(0, data.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();
    // n = 0 is first call
    return {
      is_alice_turn: data.isAliceTurn,
      board: squares.map((square: SquareData | null) => {
        if (square && square.label === 'X') {
          return 1n;
        } else if (square && square.label === 'O') {
          return 2n
        } else {
          return 0n;
        }
      }) as FixedArray<bigint, 9>
    }
  }
}
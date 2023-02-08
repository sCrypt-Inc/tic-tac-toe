import { FixedArray } from "scrypt-ts"

export type SquareData = {
    label: 'X' | 'O',
    tx?: string,
    n: number
}

export type GameData = {
    amount: number,
    name: string,
    date: Date,
    history: Array<
        {
            squares: Array<SquareData | null>,
        }
    >,
    currentStepNumber: number,
    isAliceTurn: boolean,
    start: boolean
}


export type ContractState =  {
    is_alice_turn: boolean,
    board: FixedArray<bigint, 9>
  }
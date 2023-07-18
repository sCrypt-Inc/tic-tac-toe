import {
    prop, method, SmartContract, PubKey, FixedArray, assert, Sig, Utils, toByteString, hash160,
    hash256,
    fill,
    ContractTransaction,
    MethodCallOptions,
    bsv
} from "scrypt-ts";

export class TicTacToe extends SmartContract {
    @prop()
    alice: PubKey;
    @prop()
    bob: PubKey;

    @prop(true)
    isAliceTurn: boolean;

    @prop(true)
    board: FixedArray<bigint, 9>;

    static readonly EMPTY: bigint = 0n;
    static readonly ALICE: bigint = 1n;
    static readonly BOB: bigint = 2n;

    constructor(alice: PubKey, bob: PubKey) {
        super(...arguments)
        this.alice = alice;
        this.bob = bob;
        this.isAliceTurn = true;
        this.board = fill(TicTacToe.EMPTY, 9);
    }

    @method()
    public move(n: bigint, sig: Sig) {
        // check position `n`
        assert(n >= 0n && n < 9n);
        // check signature `sig`
        let player: PubKey = this.isAliceTurn ? this.alice : this.bob;
        assert(this.checkSig(sig, player), `checkSig failed, pubkey: ${player}`);
        // update stateful properties to make the move
        assert(this.board[Number(n)] === TicTacToe.EMPTY, `board at position ${n} is not empty: ${this.board[Number(n)]}`);
        let play = this.isAliceTurn ? TicTacToe.ALICE : TicTacToe.BOB;
        this.board[Number(n)] = play;
        this.isAliceTurn = !this.isAliceTurn;
        
        // build the transation outputs
        let outputs = toByteString('');
        if (this.won(play)) {
            outputs = Utils.buildPublicKeyHashOutput(hash160(player), this.ctx.utxo.value);
        }
        else if (this.full()) {
            const halfAmount = this.ctx.utxo.value / 2n;
            const aliceOutput = Utils.buildPublicKeyHashOutput(hash160(this.alice), halfAmount);
            const bobOutput = Utils.buildPublicKeyHashOutput(hash160(this.bob), halfAmount);
            outputs = aliceOutput + bobOutput;
        }
        else {
            // build a output that contains latest contract state.
            outputs = this.buildStateOutput(this.ctx.utxo.value);
        }

        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        // make sure the transaction contains the expected outputs built above
        assert(this.ctx.hashOutputs === hash256(outputs), "check hashOutputs failed");
    }

    @method()
    won(play: bigint): boolean {
        let lines: FixedArray<FixedArray<bigint, 3>, 8> = [
            [0n, 1n, 2n],
            [3n, 4n, 5n],
            [6n, 7n, 8n],
            [0n, 3n, 6n],
            [1n, 4n, 7n],
            [2n, 5n, 8n],
            [0n, 4n, 8n],
            [2n, 4n, 6n]
        ];

        let anyLine = false;

        for (let i = 0; i < 8; i++) {
            let line = true;
            for (let j = 0; j < 3; j++) {
                line = line && this.board[Number(lines[i][j])] === play;
            }

            anyLine = anyLine || line;
        }

        return anyLine;
    }

    @method()
    full(): boolean {
        let full = true;
        for (let i = 0; i < 9; i++) {
            full = full && this.board[i] !== TicTacToe.EMPTY;
        }
        return full;
    }

    static buildTxForMove(
        current: TicTacToe,
        options: MethodCallOptions<TicTacToe>,
        n: bigint
    ): Promise<ContractTransaction> {
        const play = current.isAliceTurn ? TicTacToe.ALICE : TicTacToe.BOB
        const nextInstance = current.next()
        nextInstance.board[Number(n)] = play
        nextInstance.isAliceTurn = !current.isAliceTurn

        const unsignedTx: bsv.Transaction = new bsv.Transaction().addInput(
            current.buildContractInput(options.fromUTXO)
        )

        if (nextInstance.won(play)) {
            const script = Utils.buildPublicKeyHashScript(
                hash160(current.isAliceTurn ? current.alice : current.bob)
            )
            unsignedTx
                .addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromHex(script),
                        satoshis: current.balance,
                    })
                )
            
            if (options.changeAddress) {
                unsignedTx.change(options.changeAddress)
            }

            return Promise.resolve({
                tx: unsignedTx,
                atInputIndex: 0,
                nexts: [],
            })
        }

        if (nextInstance.full()) {
            const halfAmount = current.balance / 2

            unsignedTx
                .addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromHex(
                            Utils.buildPublicKeyHashScript(
                                hash160(current.alice)
                            )
                        ),
                        satoshis: halfAmount,
                    })
                )
                .addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromHex(
                            Utils.buildPublicKeyHashScript(hash160(current.bob))
                        ),
                        satoshis: halfAmount,
                    })
                )

            if (options.changeAddress) {
                unsignedTx.change(options.changeAddress)
            }

            return Promise.resolve({
                tx: unsignedTx,
                atInputIndex: 0,
                nexts: [],
            })
        }

        unsignedTx
            .setOutput(0, () => {
                return new bsv.Transaction.Output({
                    script: nextInstance.lockingScript,
                    satoshis: current.balance,
                })
            })
            
            
        if (options.changeAddress) {
            unsignedTx.change(options.changeAddress)
        }
        

        const nexts = [
            {
                instance: nextInstance,
                atOutputIndex: 0,
                balance: current.balance,
            },
        ]

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts,
            next: nexts[0],
        })

    }
}
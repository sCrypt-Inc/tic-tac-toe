import React from 'react';
import Board from './Board';
import { bsv, Bytes, Sig, toHex } from 'scryptlib';
import { web3, Input, SignType } from './web3';

import server from './Server';


const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[b] && squares[c] && squares[a].label === squares[b].label && squares[a].label === squares[c].label) {
      return { winner: squares[a], winnerRow: lines[i] };
    }
  }

  return { winner: null, winnerRow: null };
};

const getLocation = (move) => {
  const locationMap = {
    0: 'row: 1, col: 1',
    1: 'row: 1, col: 2',
    2: 'row: 1, col: 3',
    3: 'row: 2, col: 1',
    4: 'row: 2, col: 2',
    5: 'row: 2, col: 3',
    6: 'row: 3, col: 1',
    7: 'row: 3, col: 2',
    8: 'row: 3, col: 3',
  };

  return locationMap[move];
};

const initialState = {
  history: [
    {
      squares: Array(9).fill(null),
    },
  ],
  currentStepNumber: 0,
  xIsNext: true,
};

class Game extends React.Component {
  constructor(props) {
    super(props);

    if (props.game && props.game.gameState) {
      this.state = props.game.gameState;
    } else {
      this.state = initialState;
    }
  }



  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps', nextProps)
    if (nextProps.game && nextProps.game.gameState) {
      this.setState(nextProps.game.gameState);
    } else {
      this.setState(initialState);
    }
  }


  async componentDidMount() {
    console.log('componentDidMount', this.props)


  }

  componentWillUnmount() {

  }


  async handleClick(i) {

    if (!this.props.game || !this.props.game.lastUtxo) {
      console.error("handleClick error", this.props.game)
      return;
    }
    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();

    if (calculateWinner(squares).winner || squares[i]) {
      return;
    }
    squares[i] = { label: this.state.xIsNext ? 'X' : 'O' };
    let player = server.getIdentity();

    if (player === "alice" && this.state.xIsNext) {

    } else if (player === "bob" && !this.state.xIsNext) {

    } else {
      alert(`now is ${this.state.xIsNext ? 'Alice' : 'Bob'} turn `)
      console.error(`now is ${this.state.xIsNext ? 'Alice' : 'Bob'} turn , but got ${player}`)
      return;
    }



    let newState = (!this.state.xIsNext ? '00' : '01') + squares.map(square => {

      if (square && square.label === 'X') {
        return '01'
      } else if (square && square.label === 'O') {
        return '02'
      } else {
        return '00';
      }
    }).join('');

    let newLockingScript = "";
    let winner = calculateWinner(squares).winner;
    const FEE = 2000;
    let outputs = [];
    let amount = this.props.game.lastUtxo.satoshis - FEE;
    if (winner) {
      // winner is current player

      let address = await web3.wallet.changeAddress();

      newLockingScript = bsv.Script.buildPublicKeyHashOut(address).toHex();

      outputs.push({
        satoshis: amount,
        script: newLockingScript
      })

    } else if (history.length >= 9) {

      const aliceAddress = new bsv.PublicKey(this.props.game.alicePubKey, {
        network: bsv.Networks.testnet
      });
      const bobAddress = new bsv.PublicKey(this.props.game.bobPubKey, {
        network: bsv.Networks.testnet
      });

      console.log('aliceAddress=' + aliceAddress.toAddress(bsv.Networks.testnet))
      console.log('bobAddress=' + bobAddress.toAddress(bsv.Networks.testnet))
      //no body win
      const aliceLockingScript = bsv.Script.buildPublicKeyHashOut(aliceAddress.toAddress(bsv.Networks.testnet)).toHex();
      const bobLockingScript = bsv.Script.buildPublicKeyHashOut(bobAddress.toAddress(bsv.Networks.testnet)).toHex();
      amount = (this.props.game.lastUtxo.satoshis - FEE) / 2;

      outputs.push({
        satoshis: amount,
        script: aliceLockingScript
      })

      outputs.push({
        satoshis: amount,
        script: bobLockingScript
      })

    } else {
      //next
      newLockingScript = [this.props.contractInstance.codePart.toHex(), bsv.Script.fromASM(newState).toHex()].join('');
      outputs.push({
        satoshis: amount,
        script: newLockingScript
      })
    }




    let tx = {
      inputs: [{
        utxo: this.props.game.lastUtxo,
        sequence: 0,
        script: ""
      }],
      outputs: outputs
    }


    let preimage = web3.getPreimage(tx);

    web3.wallet.signTx(tx, 0, SignType.ALL, true).then(sig => {

      let unlockScript = this.props.contractInstance.move(i, new Sig(toHex(sig)), amount, preimage).toHex();

      tx.inputs[0].script = unlockScript;

      web3.sendTx(tx).then(txid => {

        squares[i].tx = txid;
        let gameState = {
          history: history.concat([
            {
              squares,
              currentLocation: getLocation(i),
              stepNumber: history.length,
            },
          ]),
          xIsNext: !this.state.xIsNext,
          currentStepNumber: history.length,
        };

        server.saveGame(Object.assign({}, this.props.game, {
          gameState: gameState,
          lastUtxo: {
            txHash: txid,
            outputIndex: 0,
            satoshis: tx.outputs[0].satoshis,
            script: tx.outputs[0].script
          }
        }), 'next')

        this.setState(gameState);

      }).catch(e => {
        if (e.response) {
          alert('sendTx errror: ' + e.response.data)
        }
        console.error('sendTx errror', e.response)
      })
    })

  }


  render() {
    const { history } = this.state;
    const current = history[this.state.currentStepNumber];
    const { winner, winnerRow } = calculateWinner(current.squares);



    const game = server.getGame();




    let status;
    let end;


    let bet;
    if (game && game.deploy) {
      bet = <div className="bet"><a href={`https://test.whatsonchain.com/tx/${game.deploy}`} target="_blank">Bet transaction</a> </div>
    }

    let player = server.getIdentity();
    if (winner) {
      let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
      status = `Winner is ${winnerName.toUpperCase() === player.toUpperCase() ? 'Your' : winnerName}`;
      if (game && game.lastUtxo) {
        end = <div className="end"><a href={`https://test.whatsonchain.com/tx/${game.lastUtxo.txHash}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
      if (game && game.lastUtxo) {
        end = <div className="end"><a href={`https://test.whatsonchain.com/tx/${game.lastUtxo.txHash}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else {

      let nexter = this.state.xIsNext ? 'Alice' : 'Bob';

      status = `Next player: ${nexter.toUpperCase() === player.toUpperCase() ? 'Your' : nexter}`;
    }

    return (
      <div className="game">
        <div className="game-board">

          <div className="game-status"> {status} </div>

          <Board
            squares={current.squares}
            winnerSquares={winnerRow}
            onClick={i => this.handleClick(i)}
          />

          <div className="game-title">
            {bet}
            {end}
          </div>
        </div>
      </div>
    );
  }
}

export default Game;

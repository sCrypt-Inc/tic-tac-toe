import React from 'react';
import Board from './Board';
import { web3, bsv, PubKey, toHex, Input, Bytes, Sig, SignType, getPreimage, wallet } from 'scryptlib';
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


    console.log('Game constructor', props.game)

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
    }

  }


  async componentDidMount() {
    console.log('componentDidMount', this.props)


  }

  componentWillUnmount() {

  }


  async handleClick(i) {
    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();
    squares[i] = { label: this.state.xIsNext ? 'X' : 'O' };

    if (server.getIdentity() !== "alice" && this.state.xIsNext) {
      console.error('now is alice turn')
      return;
    }

    if (server.getIdentity() !== "bob" && !this.state.xIsNext) {
      console.error('now is bob turn')
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
    if (winner) {
      // winner is alice

      let address = await web3.wallet.changeAddress();

      newLockingScript = bsv.Script.buildPublicKeyHashOut(address).toHex()

    } else {
      newLockingScript = [this.props.contractInstance.codePart.toHex(), bsv.Script.fromASM(newState).toHex()].join('');
    }


    const FEE = 2000;

    let tx = {
      inputs: [{
        utxo: this.props.game.lastUtxo,
        sequence: 0,
        script: ""
      }],
      outputs: [{
        satoshis: this.props.game.lastUtxo.satoshis - FEE,
        script: newLockingScript
      }]
    }


    let preimage = web3.getPreimage(tx);

    web3.wallet.signTx(tx, 0, SignType.ALL, true).then(sig => {

      let unlockScript = this.props.contractInstance.move(i, new Sig(toHex(sig)), this.props.game.lastUtxo.satoshis - FEE, preimage).toHex();

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

      })
    })

  }


  render() {
    const { history } = this.state;
    const current = history[this.state.currentStepNumber];
    const { winner, winnerRow } = calculateWinner(current.squares);



    let status;
    if (winner) {
      status = `Winner ${winner.label === 'X' ? 'Alice' : 'Bob'}`;
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
    } else {
      status = `Next player: ${this.state.xIsNext ? 'Alice' : 'Bob'}`;
    }

    return (
      <div className="game">
        <div className="game-board">

          <div> {status} </div>

          <Board
            squares={current.squares}
            winnerSquares={winnerRow}
            onClick={i => this.handleClick(i)}
          />
        </div>
      </div>
    );
  }
}

export default Game;

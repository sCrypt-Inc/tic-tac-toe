import React from 'react';
import Board from './Board';
import { bsv, getPreimage, signTx } from 'scryptlib';
import { web3 } from './web3';


import { GameData, PlayerAddress, PlayerPrivkey, Player, CurrentPlayer, ContractUtxos } from './storage';


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
  isAliceTurn: true,
};

const toContractState = (state) => {
  const history = state.history.slice(0, state.currentStepNumber + 1);
  const current = history[history.length - 1];
  const squares = current.squares.slice();
  // n = 0 is first call
  if (state.currentStepNumber > 0) {
    return {
      isAliceTurn: state.isAliceTurn,
      board: squares.map(square => {
        if (square && square.label === 'X') {
          return 1;
        } else if (square && square.label === 'O') {
          return 2
        } else {
          return 0;
        }
      })
    }
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    const game = GameData.get();
    if (Object.keys(game).length !== 0) {
      this.state = game;
    } else {
      this.state = initialState;
    }

    this.attachState();
  }

  clean(){
    this.setState(initialState);
  }


  canMove(isAliceTurn, i, squares) {
    const game = GameData.get();
    if (!game || Object.keys(game).length === 0) {
      alert(`Please start game first.`)
      return false;
    }

    if (calculateWinner(squares).winner || squares[i]) {
      return false;
    }

    let player = CurrentPlayer.get();

    if (player === Player.Alice && isAliceTurn) {
      return true;
    } else if (player === Player.Bob && !this.state.isAliceTurn) {
      return true;
    } else {
      alert(`now is ${this.state.isAliceTurn ? 'Alice' : 'Bob'} turn `)
      return false;
    }
  }


  attachState() {
    const states = toContractState(this.state);
    if (states && this.props.contractInstance) {
      this.props.contractInstance.isAliceTurn = states.isAliceTurn;
      this.props.contractInstance.board = states.board;
    }
  }

  async handleClick(i) {

    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();


    if (!this.canMove(this.state.isAliceTurn, i, squares)) {
      console.error('can not move now!')
      return;
    }

    const backupState = Object.assign({}, this.state);

    squares[i] = { label: this.state.isAliceTurn ? 'X' : 'O' };
    const gameState = {
      history: history.concat([
        {
          squares,
          currentLocation: getLocation(i),
          stepNumber: history.length,
        },
      ]),
      isAliceTurn: !this.state.isAliceTurn,
      currentStepNumber: history.length,
    }

    // update states
    this.setState(gameState)

    const contractUtxo = ContractUtxos.getlast().utxo;

    web3.call(contractUtxo, (tx) => {

      let winner = calculateWinner(squares).winner;

      if (winner) { // Current Player won
        let address = PlayerAddress.get(CurrentPlayer.get());

        tx.setOutput(0, (tx) => {
          return new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(address),
            satoshis: contractUtxo.satoshis - tx.getEstimateFee(),
          })
        })

      } else if (history.length >= 9) { //board is full

        tx.setOutput(0, (tx) => {
          return new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(PlayerAddress.get(Player.Alice)),
            satoshis: (contractUtxo.satoshis - tx.getEstimateFee()) /2,
          })
        })
        .setOutput(1, (tx) => {
          return new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(PlayerAddress.get(Player.Bob)),
            satoshis: (contractUtxo.satoshis - tx.getEstimateFee()) /2,
          })
        })

      } else { //continue move

        const newStates = toContractState(gameState);
        const newLockingScript = this.props.contractInstance.getNewStateScript(newStates);
        tx.setOutput(0, (tx) => {
          const amount = contractUtxo.satoshis - tx.getEstimateFee();
          return new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: amount,
          })
        })
      }

      tx.setInputScript(0, (tx, output) => {
          const preimage = getPreimage(tx, output.script, output.satoshis)
          const privateKey = new bsv.PrivateKey.fromWIF(PlayerPrivkey.get(CurrentPlayer.get()));
          const sig = signTx(tx, privateKey, output.script, output.satoshis)

          const amount = contractUtxo.satoshis - tx.getEstimateFee();
          
          if(amount < 1) {
            alert('Not enough funds.');
            throw new Error('Not enough funds.')
          }

          // we can verify locally before we broadcast the tx, if fail, 
          // it will print the launch.json in the brower webview developer tool, just copy/paste,
          // and try launch the sCrypt debugger
          // const result = this.props.contractInstance.move(i, sig, amount, preimage).verify({
          //   inputSatoshis: output.satoshis, tx
          // })

          return this.props.contractInstance.move(i, sig, amount, preimage).toScript();
        })
        .seal()


    }).then(rawTx => {

      const utxo = ContractUtxos.add(rawTx);

      squares[i].tx = utxo.utxo.txId;
      squares[i].n = history.length;

      CurrentPlayer.set(this.state.isAliceTurn ? Player.Alice : Player.Bob);

      // update states
      const gameState = Object.assign({}, this.state, {
        history: history.concat([
          {
            squares,
            currentLocation: getLocation(i),
            stepNumber: history.length,
          },
        ])
      })
      this.setState(gameState)
      GameData.update(gameState)
      this.attachState();
    })
    .catch(e => {
      //restore prev states
      this.setState(backupState)

      console.error('call contract fail', e)
    })



  }


  render() {
    const { history } = this.state;
    const current = history[this.state.currentStepNumber];
    const { winner, winnerRow } = calculateWinner(current.squares);

    const deploy = ContractUtxos.getdeploy();

    const last = ContractUtxos.getlast();


    let status;
    let end;

    let icon;


    if (CurrentPlayer.get() === Player.Bob) {
      icon = <div className="bob">Bob<img src="/tic-tac-toe/bob.png"></img></div>
    } else {
      icon = <div className="alice">Alice<img src="/tic-tac-toe/alice.jpg"></img></div>
    }

    let bet;
    if (deploy) {
      bet = <div className="bet"><a href={`https://whatsonchain.com/tx/${deploy.utxo.txId}`} target="_blank">Bet transaction</a> </div>
    }

    if (winner) {
      let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
      status = `Winner is ${winnerName}`;
      if (last) {
        end = <div className="end"><a href={`https://whatsonchain.com/tx/${last.utxo.txId}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
      if (last) {
        end = <div className="end"><a href={`https://whatsonchain.com/tx/${last.utxo.txId}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else {

      let nexter = this.state.isAliceTurn ? 'Alice' : 'Bob';

      status = `Next player: ${nexter}`;
    }

    return (
      <div className="game">
        <div className="game-board">

          <div className="game-title">
            {icon}
            <div className="game-status"> {status} </div>
          </div>

          <Board
            squares={current.squares}
            winnerSquares={winnerRow}
            onClick={i => this.handleClick(i)}
          />

          <div className="game-bottom">
            {bet}
            {end}
          </div>
        </div>
      </div>
    );
  }
}

export default Game;

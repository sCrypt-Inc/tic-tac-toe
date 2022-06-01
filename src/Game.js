import React from 'react';
import Board from './Board';
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

class Game extends React.Component {
  constructor(props) {
    super(props);
    const game = GameData.get();
    if (Object.keys(game).length !== 0) {
      this.state = game;
    } else {
      this.state = initialState;
    }

  
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

  handleClick(i) {
    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();


    if (!this.canMove(this.state.isAliceTurn, i, squares)) {
      console.error('can not move now!')
      return;
    }

    squares[i] = { label: this.state.isAliceTurn ? 'X' : 'O' };
    squares[i].n = history.length;
    let winner = calculateWinner(squares).winner;
    
    if(!winner) {
      CurrentPlayer.set(!this.state.isAliceTurn ? Player.Alice : Player.Bob);
    }

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
    GameData.update(gameState)
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
      bet = <div className="bet"><a href={`https://test.whatsonchain.com/tx/${deploy.utxo.txId}`} target="_blank">Deploy transaction</a> </div>
    }

    if (winner) {
      let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
      status = `Winner is ${winnerName}`;
      if (last) {
        end = <div className="end"><a href={`https://test.whatsonchain.com/tx/${last.utxo.txId}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
      if (last) {
        end = <div className="end"><a href={`https://test.whatsonchain.com/tx/${last.utxo.txId}`} target="_blank">Withdraw transaction</a> </div>
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

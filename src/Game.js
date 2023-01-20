import React from 'react';
import { bsv, SensiletProvider, ProviderEvent } from 'scrypt-ts';
import Board from './Board';
import { GameData, PlayerAddress, PlayerPrivkey, Player, CurrentPlayer, ContractUtxos } from './storage';
import { GameStatus } from './TitleBar';
import { Utils } from './utils';



// Convert react state to contract state
const toContractState = (state) => {
  const history = state.history.slice(0, state.currentStepNumber + 1);
  const current = history[history.length - 1];
  const squares = current.squares.slice();
  // n = 0 is first call
  if (state.currentStepNumber > 0) {
    return {
      is_alice_turn: state.is_alice_turn,
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
  is_alice_turn: true,
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

    this.attachState();

  }

  clean() {
    this.setState(initialState);
  }

  // update contract state
  attachState() {
    const states = toContractState(this.state);
    if (states && this.props.contractInstance) {
      this.props.contractInstance.is_alice_turn = states.is_alice_turn;
      this.props.contractInstance.board = states.board;
    }
  }


  canMove(is_alice_turn, i, squares) {
    const game = GameData.get();
    if (!game || Object.keys(game).length === 0) {
      alert(`Please start game first.`)
      return false;
    }

    if (calculateWinner(squares).winner || squares[i]) {
      return false;
    }

    let player = CurrentPlayer.get();

    if (player === Player.Alice && is_alice_turn) {
      return true;
    } else if (player === Player.Bob && !this.state.is_alice_turn) {
      return true;
    } else {
      alert(`now is ${this.state.is_alice_turn ? 'Alice' : 'Bob'} turn `)
      return false;
    }
  }

  async handleClick(i) {
    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();


    if (!this.canMove(this.state.is_alice_turn, i, squares)) {
      console.error('can not move now!')
      return;
    }

    const backupState = Object.assign({}, this.state);

    squares[i] = { label: this.state.is_alice_turn ? 'X' : 'O' };

    const contractUtxo = ContractUtxos.getlast().utxo;

    let winner = calculateWinner(squares).winner;

    const gameState = {
      status: (winner || history.length >= 9) ? GameStatus.over : GameStatus.progress,
      history: history.concat([
        {
          squares,
          currentLocation: getLocation(i),
          stepNumber: history.length,
        },
      ]),
      is_alice_turn: !this.state.is_alice_turn,
      currentStepNumber: history.length,
    }


    // update states
    this.setState(gameState);

    const tx = new bsv.Transaction()
      .addInput(new bsv.Transaction.Input({
        prevTxId: contractUtxo.txId,
        outputIndex: contractUtxo.outputIndex,
        script: new bsv.Script(""), // placeholder
        output: new bsv.Transaction.Output({
          script: bsv.Script.fromHex(contractUtxo.script),
          satoshis: contractUtxo.satoshis,
        })
      }))

    const inputIndex = 0;
    const newInstance = this.props.contractInstance.next();

    if (winner) { // Current Player won
      let address = PlayerAddress.get(CurrentPlayer.get());

      tx.setOutput(0, (tx) => {
        return new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(address),
          satoshis: contractUtxo.satoshis - tx.getEstimateFee(),
        })
      })

    } else if (history.length >= 9) { //board is full
      const amount = Math.ceil((contractUtxo.satoshis - tx.getEstimateFee()) / 2)
      tx.setOutput(0, (tx) => {
        return new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(PlayerAddress.get(Player.Alice)),
          satoshis: amount,
        })
      })
        .setOutput(1, (tx) => {
          return new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(PlayerAddress.get(Player.Bob)),
            satoshis: amount,
          })
        })

    } else { //continue move

      const newStates = toContractState(gameState);

      Object.assign(newInstance, newStates);

      tx.setOutput(0, (tx) => {
        const amount = contractUtxo.satoshis - tx.getEstimateFee();

        return new bsv.Transaction.Output({
          script: newInstance.lockingScript,
          satoshis: amount,
        })
      })
    }

    const privateKey = new bsv.PrivateKey.fromWIF(PlayerPrivkey.get(CurrentPlayer.get()));
    tx.setInputScript({ inputIndex, privateKey }, (tx, output) => {
      const sig = tx.getSignature(inputIndex);

      let amount = tx.getOutputAmount(0);

      if (amount < 1) {
        alert('Not enough funds.');
        throw new Error('Not enough funds.')
      }

      // we can verify locally before we broadcast the tx, if fail, 
      // it will print the launch.json in the brower webview developer tool, just copy/paste,
      // and try launch the sCrypt debugger
      // const result = this.props.contractInstance.move(i, sig, amount, preimage).verify({
      //   inputSatoshis: output.satoshis, tx
      // })

      return this.props.contractInstance.getUnlockingScript((cloned) => {
        // call previous counter's public method to get the unlocking script.
        cloned.unlockFrom = { tx, inputIndex }
        cloned.move(i, sig, amount)
      })
    })
      .seal()

      const sensiletProvider = new SensiletProvider();

      sensiletProvider.on(ProviderEvent.Connected, (provider) => {


        provider.sendTransaction(tx).then(() => {

          const utxo = ContractUtxos.add(tx.toString());
  
          this.props.updateContractInstance(newInstance);
    
          squares[i].tx = utxo.utxo.txId;
          squares[i].n = history.length;
    
          if (!winner) {
            CurrentPlayer.set(this.state.is_alice_turn ? Player.Alice : Player.Bob);
          }
    
    
          // update states
          const newGameState = Object.assign({}, this.state, {
            history: history.concat([
              {
                squares,
                currentLocation: getLocation(i),
                stepNumber: history.length,
              },
            ])
          })
          this.setState(newGameState)
          GameData.update(newGameState)
          this.props.updateGameStatus();
          this.attachState();
    
  
        })
        .catch(e => {
          console.error("sendTransaction error:", e)
          this.setState(backupState)
        })
   
      })

      sensiletProvider.connect()
      

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
      bet = <div className="bet"><a href={Utils.getTxUri(deploy.utxo.txId)} target="_blank" >Deploy transaction</a> </div>
    }

    if (winner) {
      let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
      status = `Winner is ${winnerName}`;
      if (last) {
        end = <div className="end"><a href={Utils.getTxUri(last.utxo.txId)} target="_blank"  >Withdraw transaction</a> </div>
      }
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
      if (last) {
        end = <div className="end"><a href={Utils.getTxUri(last.utxo.txId)} target="_blank" >Withdraw transaction</a> </div>
      }
    } else {

      let nexter = this.state.is_alice_turn ? 'Alice' : 'Bob';

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

import React from 'react';
import Board from './Board';
import { bsv, Bytes, Sig, toHex } from 'scryptlib';
import { web3, Input, SignType } from './web3';

import server from './Server';
import { getPreimage, toRawTx, toBsvTx } from './web3/wutils';
import { DotWalletAddress, DotWalletPublicKey, getPlayer } from './utils';


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


  calculateNewState(squares) {
    return (!this.state.xIsNext ? '00' : '01') + squares.map(square => {

      if (square && square.label === 'X') {
        return '01'
      } else if (square && square.label === 'O') {
        return '02'
      } else {
        return '00';
      }
    }).join('');
  }

  calculateOldState(squares) {
    return (this.state.xIsNext ? '00' : '01') + squares.map(square => {

      if (square && square.label === 'X') {
        return '01'
      } else if (square && square.label === 'O') {
        return '02'
      } else {
        return '00';
      }
    }).join('');
  }


  checkIfValid(i, squares) {
    if (!this.props.game || !this.props.game.lastUtxo) {
      return false;
    }

    if (calculateWinner(squares).winner || squares[i]) {
      return false;
    }
    squares[i] = { label: this.state.xIsNext ? 'X' : 'O' };
    let player = server.getCurrentPlayer();

    if (player === "alice" && this.state.xIsNext) {
      return true;
    } else if (player === "bob" && !this.state.xIsNext) {
      return true;
    } else {
      alert(`now is ${this.state.xIsNext ? 'Alice' : 'Bob'} turn `)
      console.error(`now is ${this.state.xIsNext ? 'Alice' : 'Bob'} turn , but got ${player}`)
      return false;
    }
  }


  async buildCallContractTx(i, newState, oldState, squares, history) {
    let newLockingScript = "";
    let winner = calculateWinner(squares).winner;
    const FEE = 3000;
    let outputs = [];
    let amount = this.props.game.lastUtxo.satoshis - FEE;
    if (winner) {
      const player = getPlayer();
      // winner is current player
      
      let address = await DotWalletAddress.get(player);

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


    if (outputs[0].satoshis <= 0) {
      alert(`fund in contract is too low `)
      return undefined;
    }


    let tx = {
      inputs: [{
        utxo: this.props.game.lastUtxo,
        sequence: 0,
        script: ""
      }],
      outputs: outputs
    }

    let preimage = getPreimage(tx);

    const addr = DotWalletAddress.get();

    let sig = await web3.wallet.getSignature(toRawTx(tx), 0, SignType.ALL, addr);

    this.props.contractInstance.setDataPart(oldState);
    

    let unlockScript = this.props.contractInstance.move(i, new Sig(toHex(sig)), amount, preimage).toHex();

    tx.inputs[0].script = unlockScript;

    // we can verify locally before we broadcast the tx, if fail, 
    // it will print the launch.json in the brower webview developer tool, just copy/paste,
    // and try launch the sCrypt debugger

    const result = this.props.contractInstance.move(i, new Sig(toHex(sig)), amount, preimage).verify({ inputSatoshis: this.props.game.lastUtxo.satoshis, tx: toBsvTx(tx) })

    if (!result.success) {
      throw new Error(result.error)
    }

    return tx;
  }


  async handleClick(i) {

    const history = this.state.history.slice(0, this.state.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();

    const oldState = this.calculateOldState(squares);
    if (!this.checkIfValid(i, squares)) {
      console.error('handleClick checkIfValid false...')
      return;
    }


    let newState = this.calculateNewState(squares);

    // let tx = await this.buildCallContractTx(i, newState, squares, history);
    let tx = await this.buildCallContractTx(i, newState, oldState, squares, history);

    if (!tx) {
      console.error('buildCallContractTx fail...')
      return;
    }

    web3.sendTx(tx).then(txid => {

      squares[i].tx = txid;
      squares[i].n = history.length;
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

  }


  render() {
    const { history } = this.state;
    const current = history[this.state.currentStepNumber];
    const { winner, winnerRow } = calculateWinner(current.squares);



    const game = server.getGame();




    let status;
    let end;

    let icon;


    if (server.getCurrentPlayer() === 'bob') {
      icon = <div className="bob">Bob<img src="/tic-tac-toe/bob.png"></img></div>
    } else {
      icon = <div className="alice">Alice<img src="/tic-tac-toe/alice.jpg"></img></div>
    }

    let bet;
    if (game && game.deploy) {
      bet = <div className="bet"><a href={`https://whatsonchain.com/tx/${game.deploy}`} target="_blank">Bet transaction</a> </div>
    }

    let player = server.getCurrentPlayer();
    if (winner) {
      let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
      status = `Winner is ${winnerName}`;
      if (game && game.lastUtxo) {
        end = <div className="end"><a href={`https://whatsonchain.com/tx/${game.lastUtxo.txHash}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else if (history.length === 10) {
      status = 'Draw. No one won.';
      if (game && game.lastUtxo) {
        end = <div className="end"><a href={`https://whatsonchain.com/tx/${game.lastUtxo.txHash}`} target="_blank">Withdraw transaction</a> </div>
      }
    } else {

      let nexter = this.state.xIsNext ? 'Alice' : 'Bob';

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

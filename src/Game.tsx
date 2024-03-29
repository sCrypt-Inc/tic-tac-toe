import { useState } from "react";
import Board from './Board';
import { TicTacToe } from "./contracts/tictactoe";
import { GameData, SquareData } from "./types";
import { Utils } from "./utils";
import { bsv, SignatureResponse, findSig, MethodCallOptions } from 'scrypt-ts';

const calculateWinner = (squares: any) => {
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



function Game(props: any) {

  const gameData = props.gameData as GameData;
  const setGameData = props.setGameData;

  const [lastTxId, setLastTxId] = useState<string>("")

  function canMove(i: number, squares: any) {
    if (calculateWinner(squares).winner || squares[i]) {
      return false;
    }

    return true;
  }

  async function move(i: number) {
    const current = props.contract as TicTacToe;

    current.bindTxBuilder('move', TicTacToe.buildTxForMove);

    const pubKey = current.isAliceTurn ? current.alice : current.bob;

    return current.methods.move(
      BigInt(i),
      (sigResponses: SignatureResponse[]) => {
        return findSig(sigResponses, bsv.PublicKey.fromString(pubKey))
      },
      {
        pubKeyOrAddrToSign: bsv.PublicKey.fromString(pubKey),
        changeAddress: await current.signer.getDefaultAddress()
      } as MethodCallOptions<TicTacToe>)
  }

  async function handleClick(i: number) {
    if (!gameData.start) {
      alert(`Game hasn't been started yet.`)
      return;
    }
    
    const history = gameData.history.slice(0, gameData.currentStepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();
  

    if (!canMove(i, squares)) {
      console.error('can not move now!')
      return;
    }

    squares[i] = {
      label: gameData.isAliceTurn ? 'X' : 'O',
      n: history.length
    };

    // Call smart contract move method.

    try {
      const { tx, nexts } = await move(i);

      const square = squares[i] as SquareData;
      if (square) {
        square.tx = tx.id;
      }
  
      console.log('move txid:', tx.id)
  
      // update states
      if (nexts && nexts[0]) {
        const instance = nexts[0].instance
        props.setContract(instance)
      }
      const winner = calculateWinner(squares).winner;
      setGameData({
        ...gameData,
        history: history.concat([
          {
            squares
          },
        ]),
        isAliceTurn: winner ? gameData.isAliceTurn : !gameData.isAliceTurn,
        currentStepNumber: history.length,
        start: true
      })
      setLastTxId(tx.id)
    } catch (error) {
      console.error("error:", error);
      alert("ERROR:" + error.message)
    }
   
  }


  const { history } = gameData;
  const current = history[gameData.currentStepNumber];
  const { winner, winnerRow } = calculateWinner(current.squares);


  let status;

  let icon;


  if (!gameData.isAliceTurn) {
    icon = <div className="bob" > Bob <img src="/tic-tac-toe/bob.png" alt="" /></div>
  } else {
    icon = <div className="alice" > Alice <img src="/tic-tac-toe/alice.jpg" alt="" /></div>
  }

  if (winner) {
    let winnerName = winner.label === 'X' ? 'Alice' : 'Bob';
    status = `Winner is ${winnerName}`;
  } else if (history.length === 10) {
    status = 'Draw. No one won.';
  } else {

    let nexter = gameData.isAliceTurn ? 'Alice' : 'Bob';

    status = `Next player: ${nexter}`;
  }

  return (
    <div className="game" >
      <div className="game-board" >

        <div className="game-title" >
          {icon}
          < div className="game-status" > {status} </div>
        </div>

        < Board
          squares={current.squares}
          winnerSquares={winnerRow}
          onClick={handleClick}
        />

        <div className="game-bottom" >
          {props.deployedTxId ? <div className="bet"><a href={Utils.getTxUri(props.deployedTxId)} target="_blank" rel="noreferrer" >Deploy transaction</a> </div> : undefined}
          {winner || history.length === 10 ? <div className="end"><a href={Utils.getTxUri(lastTxId)} target="_blank" rel="noreferrer" >Withdraw transaction</a> </div> : undefined}
        </div>
      </div>
    </div>);
}

export default Game;

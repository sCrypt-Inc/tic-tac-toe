import React, { useState, useEffect } from "react";
import Board from './Board';
import { GameData } from "./types";


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
  function canMove(i: number, squares: any) {
    if (!gameData.start) {
      alert("Pelease start the game!");
      return;
    }

    if (calculateWinner(squares).winner || squares[i]) {
      return false;
    }

    return true;
  }

  async function handleClick(i: number) {
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

    let winner = calculateWinner(squares).winner;

    const gameData_ = {
      history: history.concat([
        {
          squares
        },
      ]),
      isAliceTurn: winner ? gameData.isAliceTurn : !gameData.isAliceTurn,
      currentStepNumber: history.length,
      start: true
    }

    // update states
    setGameData(gameData_)
  }






  const { history } = gameData;
  const current = history[gameData.currentStepNumber];
  const { winner, winnerRow } = calculateWinner(current.squares);


  let status;
  let end;

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
          {end}
        </div>
      </div>
    </div>);
}

export default Game;

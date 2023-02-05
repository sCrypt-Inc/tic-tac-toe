import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";

const initialGameData = {
  amount: 0,
  name: "tic-tac-toe",
  date: new Date(),
  history: [
    {
      squares: Array(9).fill(null),
    },
  ],
  currentStepNumber: 0,
  isAliceTurn: true,
  start: false
}

function App() {

  const [gameData, setGameData] = useState(initialGameData);

  const startGame = async (amount: number) => {
    setGameData(Object.assign({}, gameData, {
      start: true
    }))
  };

  const cancelGame = async () => {
    setGameData(Object.assign({}, gameData, initialGameData))
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          onStart={startGame}
          onCancel={cancelGame}
          started={gameData.start}
        />
        <Game gameData={gameData} setGameData={setGameData}/>

      </header>
    </div>
  );
}

export default App;

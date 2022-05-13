import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import {GameData, PlayerPublicKey, Player, ContractUtxos, CurrentPlayer} from "./storage";


function App() {

  const ref = React.createRef();

  const [states, updateStates] = useState({
    started: false,
    isConnected: false,
    instance: null
  });

  // init web3 wallet
  useEffect(async () => {

    updateStates({
      started: Object.keys(GameData.get()).length > 0,
      isConnected: false,
      instance: null
    })

  }, []);

  const startGame = async (amount) => {

    let gameStates = {
      amount: amount,
      name: "tic-tac-toe",
      date: new Date(),
      history: [
        {
          squares: Array(9).fill(null),
        },
      ],
      currentStepNumber: 0,
      isAliceTurn: true,
    };
    GameData.set(gameStates);
    CurrentPlayer.set(Player.Alice);
    updateStates(Object.assign({}, states, {
      started: true
    }))
    
  };

  const cancelGame = async () => {
    GameData.clear();
    ContractUtxos.clear();
    CurrentPlayer.set(Player.Alice);



    ref.current.clean();

    updateStates({
      started: false,
      isConnected: states.isConnected,
      instance: states.instance
    })

  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          onStart={startGame}
          onCancel={cancelGame}
          started={states.started}
        />
        <Game ref={ref}/>

      </header>
    </div>
  );
}

export default App;

import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import {GameData, PlayerPublicKey, Player, ContractUtxos, CurrentPlayer} from "./storage";
import { web3 } from "./web3";
import { PubKey } from "scryptlib/dist";


async function fetchContract(alicePubKey, bobPubKey) {
  let { contractClass: TictactoeContractClass } = await web3.loadContract(
    "/tic-tac-toe/tictactoe_release_desc.json"
  );

  return new TictactoeContractClass(
    new PubKey(alicePubKey),
    new PubKey(bobPubKey),
    true,
    [0,0,0,0,0,0,0,0,0]
  );
}


function App() {

  const ref = React.createRef();

  const [states, updateStates] = useState({
    started: false,
    isConnected: false,
    instance: null
  });

  // init web3 wallet
  useEffect(async () => {

    const timer = setTimeout(async ()=> {

      const instance = await fetchContract(PlayerPublicKey.get(Player.Alice),
        PlayerPublicKey.get(Player.Bob))

      updateStates({
        started: Object.keys(GameData.get()).length > 0,
        isConnected: false,
        instance: instance
      })

    }, 100)


    return () => {
      clearTimeout(timer)
    }

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
        <Game ref={ref} contractInstance={states.instance}/>

      </header>
    </div>
  );
}

export default App;

import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { PubKey } from "scryptlib";
import { web3, SensiletWallet } from "./web3";
import Balance from "./balance";
import {GameData, PlayerPublicKey, Player, ContractUtxos, CurrentPlayer} from "./storage";
import Auth from "./auth";


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
      web3.setWallet(new SensiletWallet())
      const isConnected = await web3.wallet.isConnected();
      console.log("sensilet isConnected: ", isConnected);
  
      const instance = await fetchContract(PlayerPublicKey.get(Player.Alice),
        PlayerPublicKey.get(Player.Bob))
      
      updateStates({
        started: Object.keys(GameData.get()).length > 0,
        isConnected: isConnected,
        instance: instance
      })
  
    }, 100)


    return () => {
      clearTimeout(timer)
    }

  }, []);

  const startBet = async (amount) => {

    if (web3.wallet && states.instance) {

      web3.deploy(states.instance, amount).then(rawTx => {

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
  
        ContractUtxos.add(rawTx);
        GameData.set(gameStates);
        CurrentPlayer.set(Player.Alice);

        updateStates(Object.assign({}, states, {
          started: true
        }))
      })
    }
  };

  const cancelBet = async () => {
    GameData.clear();
    ContractUtxos.clear();
    CurrentPlayer.set(Player.Alice);

    if(states.instance) {
      // restore states
      states.instance.isAliceTurn = true;
      states.instance.board = [0,0,0,0,0,0,0,0,0];
    }

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
          startBet={startBet}
          cancelBet={cancelBet}
          started={states.started}
        />
        <Game ref={ref} contractInstance={states.instance} />

        {states.isConnected ? <Balance></Balance> : <Auth></Auth>}
      </header>
    </div>
  );
}

export default App;

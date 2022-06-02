import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { PubKey } from "scryptlib";
import Balance from "./balance";
import {GameData, PlayerPublicKey, Player, ContractUtxos, CurrentPlayer} from "./storage";
import { SensiletWallet, web3 } from "./web3";
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

      const instance = await fetchContract(PlayerPublicKey.get(Player.Alice),
        PlayerPublicKey.get(Player.Bob))

      const wallet =  new SensiletWallet();
      const n = await wallet.getNetwork();
      web3.setWallet(new SensiletWallet(n));

      const isConnected = await web3.wallet.isConnected();

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

  const startGame = async (amount) => {

    if(web3.wallet && states.instance) {

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
      .catch(e => {
        alert(e.message)
        console.error(e)
      })
    }

    
    
  };

  const cancelGame = async () => {
    GameData.clear();
    ContractUtxos.clear();
    CurrentPlayer.set(Player.Alice);

    if(states.instance) {
      // reset states
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
          onStart={startGame}
          onCancel={cancelGame}
          started={states.started}
        />
        <Game ref={ref} contractInstance={states.instance}/>
        {states.isConnected ? <Balance></Balance> : <Auth></Auth>}
      </header>
    </div>
  );
}

export default App;

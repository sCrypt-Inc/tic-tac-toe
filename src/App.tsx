import "./App.css";
import Game from "./Game";
import React, { useState, useEffect, useRef } from "react";
import TitleBar from "./TitleBar";
import { WhatsonchainProvider, bsv, SensiletSigner, PubKey, toHex } from "scrypt-ts";
import { TicTacToe } from "./contracts/tictactoe";
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
  const [isConnected, setConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const signerRef = useRef<SensiletSigner>();
  const [contract, setContract] = useState<TicTacToe | undefined>(undefined)
  const [deployedTxId, setDeployedTxId] = useState<string>("")


  const startGame = async (amount: number) => {

    if (!isConnected) {
      alert("Peleas connect wallet first.")
      return
    }

    try {
      const signer = signerRef.current as SensiletSigner;

      const pubkey = await signer.getDefaultPubKey()
  
      const instance = new TicTacToe(
        PubKey(toHex(pubkey)),
        PubKey(toHex(pubkey))
      ).markAsGenesis();
    
      await instance.connect(signer);
  
      const tx = await instance.deploy(amount);

      setDeployedTxId(tx.id)
  
      setContract(instance)
  
      setGameData(Object.assign({}, gameData, {
        start: true
      }))
    } catch(e) {
      console.error('deploy TicTacToe failes', e)
      alert('deploy TicTacToe failes')
    }
    
  };

  const cancelGame = async () => {
    setGameData(Object.assign({}, gameData, initialGameData))
  };

  const sensiletLogin = async () => {
    try {
      const provider = new WhatsonchainProvider(bsv.Networks.testnet);
      const signer = new SensiletSigner(provider);

      signerRef.current = signer;
      await signer.getConnectedTarget();
      setConnected(true);


      signer.getBalance().then(balance => {
        setBalance(balance.confirmed + balance.unconfirmed)
      })
    } catch (error) {
      console.error("sensiletLogin failed", error);
      alert("sensiletLogin failed")
    }
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
        <Game gameData={gameData} setGameData={setGameData} deployedTxId={deployedTxId} />

        {
          isConnected ?
            <label>Balance: {balance} <span> (satoshis)</span></label>
            :
            <button
              className="pure-button button-large sensilet"
              onClick={sensiletLogin}
            >
              Connect Wallet
            </button>
        }
      </header>
    </div>
  );
}

export default App;

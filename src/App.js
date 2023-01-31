import "./App.css";
import Game, { toContractState } from "./Game";
import React, { useState, useEffect, useRef } from "react";
import TitleBar, { GameStatus } from "./TitleBar";
import { PubKey, toHex, WhatsonchainProvider, bsv } from "scrypt-ts";
import Balance from "./balance";
import { GameData, Player, ContractUtxos, CurrentPlayer } from "./storage";
import { Utils } from "./utils";
import Auth from "./auth";
import { Footer } from "./Footer";
import { TicTacToe } from "./contracts/tictactoe"
import { SensiletSigner, ProviderEvent } from "scrypt-ts";


async function initTicTacToe(signer) {
  let artifact = await Utils.loadContractArtifact(
    `${process.env.PUBLIC_URL}/${TicTacToe.name}.json`
  );

  let info = await Utils.loadTransformInfo(
    `${process.env.PUBLIC_URL}/${TicTacToe.name}.transformer.json`
  );

  TicTacToe.init(info, artifact);

  const pubkey = await signer.getDefaultPubKey()

  const instance = new TicTacToe(
    PubKey(toHex(pubkey)),
    PubKey(toHex(pubkey)),
    true,
    [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
  );

  await instance.connect(signer);

  const gameState = GameData.get();

  if (Object.keys(gameState).length === 0 || gameState.currentStepNumber === 0) {
    instance.markAsGenesis()

  } else if (Object.keys(gameState).length > 0) {
    const contractState = toContractState(gameState)
    Object.assign(instance, contractState);
  }

  return instance;

}



function App() {

  const gameRef = React.createRef();

  const instanceRef = useRef(null);
  const signerRef = useRef(null);


  const [states, updateStates] = useState({
    gameStatus: GameStatus.wait,
    isConnected: false,
  });

  useEffect(() => {

    const provider = new WhatsonchainProvider(bsv.Networks.testnet);

    provider.on(ProviderEvent.NetworkChange, network => {
      Utils.setNetwork(network);
    })

    const signer = new SensiletSigner(provider);

    signerRef.current = signer;

    const gameState = GameData.get();

    signer.isSensiletConnected().then(isConnected => {
      if (isConnected) {
        signer.connect(provider);
        initTicTacToe(signer).then(async instance => {

          instanceRef.current = instance;
          updateStates(Object.assign({}, states, {
            gameStatus: Object.keys(gameState).length > 0 ? gameState.status : GameStatus.wait,
            isConnected: isConnected
          }))

        }).catch(async e => {
          const isConnected = await signer.isConnected();

          updateStates(Object.assign({}, states, {
            gameStatus: Object.keys(gameState).length > 0 ? gameState.status : GameStatus.wait,
            isConnected: isConnected
          }))
          console.error('fetchContract fails', e);
        })

      } else {
        updateStates({
          gameStatus: GameStatus.wait,
          isConnected: isConnected
        })
      }
    })
  }, []);

  const startGame = async (amount) => {


    if (instanceRef.current !== null) {
      try {

        const deployTx = await instanceRef.current.deploy(amount);

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
          is_alice_turn: true,
          status: GameStatus.progress
        };

        ContractUtxos.add(deployTx.toString());
        GameData.set(gameStates);
        CurrentPlayer.set(Player.Alice);

        updateStates(Object.assign({}, states, {
          gameStatus: GameStatus.progress
        }))
      } catch (error) {
        console.error('deployed failed:', error)
        alert("deployed failed:" + error.message)
      }

    }


  };

  const cancelGame = async () => {
    GameData.clear();
    ContractUtxos.clear();
    CurrentPlayer.set(Player.Alice);

    if (instanceRef.current) {
      // reset states
      instanceRef.current.markAsGenesis()
      instanceRef.current.is_alice_turn = true;
      instanceRef.current.board = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];
    }

    gameRef.current.clean();

    updateStates({
      gameStatus: GameStatus.wait,
      isConnected: states.isConnected
    })

  };

  const updateGameStatus = async () => {
    const gameState = GameData.get();
    if (Object.keys(GameData.get()).length > 0) {
      updateStates(Object.assign({}, states, {
        gameStatus: gameState.status
      }))
    } else {
      updateStates({
        gameStatus: GameStatus.wait
      })
    }
  };

  const updateContractInstance = async (instance) => {
    instanceRef.current = instance;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          onStart={startGame}
          onCancel={cancelGame}
          gameStatus={states.gameStatus}
          signer={signerRef.current}
        />
        <Game ref={gameRef} contractInstance={instanceRef.current} updateGameStatus={updateGameStatus} updateContractInstance={updateContractInstance} />
        {states.isConnected ? <Balance signer={signerRef.current}></Balance> : <Auth signer={signerRef.current}></Auth>}
      </header>
      <Footer />
    </div>
  );
}

export default App;

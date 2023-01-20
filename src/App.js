import "./App.css";
import Game, { calculateWinner } from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar, { GameStatus } from "./TitleBar";
import { PubKey } from "scrypt-ts";
import Balance from "./balance";
import { GameData, PlayerPublicKey, Player, ContractUtxos, CurrentPlayer } from "./storage";
import { Utils } from "./utils";
import Auth from "./auth";
import { Footer } from "./Footer";
import { TicTacToe } from "./contracts/tictactoe"
import { SensiletProvider, ProviderEvent } from "scrypt-ts";



function App() {

  const ref = React.createRef();

  const [states, updateStates] = useState({
    gameStatus: GameStatus.wait,
    isConnected: false,
    instance: null
  });

  useEffect(() => {
    async function fetchContract(alicePubKey, bobPubKey) {

      let artifact = await Utils.loadContractArtifact(
        `${process.env.PUBLIC_URL}/${TicTacToe.name}.json`
      );

      let info = await Utils.loadTransformInfo(
        `${process.env.PUBLIC_URL}/${TicTacToe.name}.transformer.json`
      );

      TicTacToe.init(info, artifact);

      return new TicTacToe(
        PubKey(alicePubKey),
        PubKey(bobPubKey),
        true,
        [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
      ).markAsGenesis();
    }

    fetchContract(PlayerPublicKey.get(Player.Alice), PlayerPublicKey.get(Player.Bob))
      .then(async instance => {
        console.log('instance', instance)

        const sensiletProvider = new SensiletProvider();

        const isConnected = await sensiletProvider.getSigner().isConnected();

        if(isConnected) {

          const sensiletProvider = new SensiletProvider();

          sensiletProvider.on(ProviderEvent.Connected, async (provider) => {
            const network = await provider.getNetwork();
            Utils.setNetwork(network.name === 'testnet');
          })

          await sensiletProvider.connect();

          const gameState = GameData.get();
  
          updateStates(Object.assign({}, states, {
            gameStatus:  Object.keys(gameState).length > 0 ? gameState.status : GameStatus.wait,
            isConnected: isConnected,
            instance: instance
          }))

          
        } else {
          updateStates({
            gameStatus: GameStatus.wait,
            isConnected: isConnected,
            instance: instance
          })
        }
      })
      .catch(e => {
        console.error('fetchContract fails', e);
      })

  }, []);

  const startGame = async (amount) => {

    if (states.instance) {


      try {

        const provider = new SensiletProvider();

        await states.instance.connect(provider);
        const deployTx = await states.instance.deploy(amount);

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
        alert("deployed failed:" + error.message)
      }


    }
  };

  const cancelGame = async () => {
    GameData.clear();
    ContractUtxos.clear();
    CurrentPlayer.set(Player.Alice);

    if (states.instance) {
      // reset states
      states.instance.is_alice_turn = true;
      states.instance.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    ref.current.clean();

    updateStates({
      gameStatus: GameStatus.wait,
      isConnected: states.isConnected,
      instance: states.instance
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
    updateStates(Object.assign({}, states, {
      instance: instance
    }))
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          onStart={startGame}
          onCancel={cancelGame}
          gameStatus={states.gameStatus}
        />
        <Game ref={ref} contractInstance={states.instance} updateGameStatus={updateGameStatus} updateContractInstance={updateContractInstance} />
        {states.isConnected ? <Balance></Balance> : <Auth></Auth>}
      </header>
      <Footer />
    </div>
  );
}

export default App;

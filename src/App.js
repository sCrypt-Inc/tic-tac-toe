import './App.css';
import Game from './Game';
import React, { useState, useEffect } from 'react';
import TitleBar from './TitleBar';
import { web3, LocalWallet, NetWork, bsv, PubKey, toHex, SignType, Input } from 'scryptlib';
import Wallet from './wallet';

import server from './Server';



function App() {

  const [started, updateStart] = useState(false);

  const forceUpdate = React.useReducer(bool => !bool)[1];

  const startBet = async (amount) => {

    //let tx = await web3.deploy(contractInstance, 10000);
    console.log('startBet with amount', amount)

    if (web3.wallet) {

      //let tx = await web3.buildUnsignDeployTx(contractInstance, 10000);

      let alicePubKey = await web3.wallet.publicKey();


      server.createGame({
        "amount": amount,
        "tx": {
          inputs: [],
          outputs: []
        },
        "name": "tic-tac-toe",
        "alicePubKey": alicePubKey,
        "bobPubKey": "",
        "creator": "alice",
        "player": "",
        "date": new Date()
      })

      forceUpdate();
    }
  }

  const cancelBet = () => {

    server.deleteGame();
    updateStart(false)
    forceUpdate();
  }

  const onJoin = async (game) => {


    console.log('onJoin', game)


    if (game.creator === "alice" && server.getIdentity() === "alice") {

      let tx = await web3.appendPayInput(game.tx, game.amount);
      game.tx = tx;


      server.saveGame(game, 'AliceSign');

    } else {
      updateStart(true);
    }
  }


  const onAliceSign = async (game) => {
    //Alice SIGN

    if (game.creator === "alice" && server.getIdentity() === "bob") {

      console.log('onAliceSign', game)
      let sig = await web3.wallet.signTx(game.tx, 0, SignType.ALL);
      game.tx.inputs[0].script = sig;
      web3.sendTx(game.tx).then((txid => {
        game.deploy = txid;
        server.saveGame(game, "BobSign")
        updateStart(true)
      }))
    }

  }


  const onBobSign = async (game) => {
    //BOB SIGN
    if (game.creator === "alice" && server.getIdentity() === "alice") {
      console.log('onBobSign', game)
      updateStart(true)
    }
  }


  useEffect(() => {


    server.addJoinListener(onJoin);
    server.addAliceSignListener(onAliceSign);
    server.addBobSignListener(onBobSign);
    return () => {

      server.removeAliceSignListener(onAliceSign)
      server.removeBobSignListener(onBobSign)
      server.removeJoinListener(onJoin)
    }

  }, []);

  return (
    <div className="App">
      <Wallet updateWallet={() => {
        console.log('updateWallet')
        forceUpdate()
      }}></Wallet>
      <header className="App-header">
        <h2>
          sCrypt dapp tic-tac-toe
        </h2>

        {
          web3.wallet ? <div><TitleBar startBet={startBet} cancelBet={cancelBet} started={started} game={server.getGame()} /> <Game /> </div> : <div> Please create wallet! </div>
        }

      </header>
    </div>
  );
}

export default App;

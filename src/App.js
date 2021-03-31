import './App.css';
import Game from './Game';
import React, { useState, useEffect } from 'react';
import TitleBar from './TitleBar';
import { Bytes, PubKey, toHex, newCall } from 'scryptlib';

import { web3, SignType } from './web3';
import Wallet from './wallet';

import server from './Server';



function App() {

  const [started, updateStart] = useState(false);

  const [contractInstance, updateContractInstance] = useState(null);

  const forceUpdate = React.useReducer(bool => !bool)[1];

  const startBet = async (amount) => {

    //let tx = await web3.deploy(contractInstance, 10000);
    console.log('startBet with amount', amount)

    if (server.getIdentity() === 'bob') {
      alert('Only Alice can start bet')
      return
    }

    if (web3.wallet) {

      //let tx = await web3.buildUnsignDeployTx(contractInstance, 10000);

      let balance = await web3.wallet.balance();

      if (amount > balance) {
        alert('Please fund your wallet address first')
        return
      }

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

  const onBobJoin = async (game) => {


    console.log('onBobJoin', game)


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
        game.lastUtxo = {
          txHash: txid,
          outputIndex: 0,
          satoshis: game.tx.outputs[0].satoshis,
          script: game.tx.outputs[0].script
        };

        game.deploy = txid;

        server.saveGame(game, "deployed")
        updateStart(true)
      }))
    }

  }


  const onDeployed = async (game) => {
    //BOB SIGN
    if (game.creator === "alice" && server.getIdentity() === "alice") {
      console.log('onDeployed', game)

      fetchContract(game)
      updateStart(true)
    } else {
      console.warn('onDeployed but not receive by Alice', game)
    }
  }


  const onNext = async (game) => {
    //BOB SIGN
    console.log("onNext", game)
    forceUpdate();
  }


  async function fetchContract(game) {


    if (contractInstance === null && game && game.bobPubKey && game.alicePubKey) {
      let {
        contractClass: TictactoeContractClass
      } = await web3.loadContract("/tic-tac-toe/tictactoe_desc.json");

      let c = newCall(TictactoeContractClass, [new PubKey(toHex(game.alicePubKey)), new PubKey(toHex(game.bobPubKey))])
      c.setDataPart(game.state ? game.state : '00000000000000000000');
      console.log('fetchContract', c)
      updateContractInstance(c);
      return c;
    }
    console.log('fetchContract null')
    return contractInstance
  }


  useEffect(() => {
    let game = server.getGame();

    if (game && game.lastUtxo) {
      updateStart(true)
    }



    async function bobJoin(game) {

      let bobPubKey = await web3.wallet.publicKey();

      let balance = await web3.wallet.balance();


      if (balance <= game.amount) {
        alert('no available utxos or  balance is not enough, please fund your wallet')
        return;
      }

      game = Object.assign(game, {
        "bobPubKey": bobPubKey,
        "player": "Bob"
      })


      let c = await fetchContract(game);

      console.log('bobJoin fetchContract', c)
      if (c != null) {
        web3.buildUnsignDeployTx(c, game.amount).then(tx => {
          tx.outputs[0].satoshis = game.amount * 2;
          server.saveGame(Object.assign(game, {
            "tx": tx
          }), "JoinGame")
        }).catch(e => {
          if (e.message === 'no utxos') {
            alert('no available utxos, please fund your wallet')
          }
          console.error('buildUnsignDeployTx error', e)
        })
      }
    }


    if (server.getIdentity() === 'bob' && game && !game.deploy) {

      if (web3.wallet) {
        bobJoin(game)
      } else {
        setTimeout(() => {
          alert('Please create your wallet and fund it');
        }, 1000)

      }


    } else {
      fetchContract(game);
    }



    server.addJoinListener(onBobJoin);
    server.addAliceSignListener(onAliceSign);
    server.addDeployedListener(onDeployed);
    server.addNextListener(onNext)
    return () => {

      server.removeAliceSignListener(onAliceSign)
      server.removeDeployedListener(onDeployed)
      server.removeJoinListener(onBobJoin)
      server.removeNextListener(onNext)
    }

  }, [contractInstance]);


  const game = server.getGame();

  return (
    <div className="App">

      <header className="App-header">
        <h2>
          sCrypt dapp tic-tac-toe
        </h2>
        <TitleBar startBet={startBet} cancelBet={cancelBet} started={started} game={game} />

        <Game game={game} contractInstance={contractInstance} />

        <Wallet updateWallet={() => {
          forceUpdate()
        }}></Wallet>
      </header>
    </div >
  );
}

export default App;

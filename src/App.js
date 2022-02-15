import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { Bytes, PubKey, toHex, bsv } from "scryptlib";

import { DotWallet, web3, UTXO } from "./web3";
import Wallet from "./wallet";
import server from "./Server";
import { PlayerPublicKey, PlayerAddress } from "./utils";
import { Sensilet } from "./web3/sensilet";

function App() {
  const [started, updateStart] = useState(false);

  const [contractInstance, updateContractInstance] = useState(null);

  const forceUpdate = React.useReducer((bool) => !bool)[1];

  const startBet = async (amount) => {
    //let tx = await web3.deploy(contractInstance, 10000);
    console.log("startBet with amount", amount);

    if (web3.wallet) {
      let balance = await web3.wallet.getbalance();

      if (amount > balance) {
        alert("Please fund your wallet address first");
        return;
      }

      let player = server.getCurrentPlayer();

      let game = {
        amount: amount,
        tx: {
          inputs: [],
          outputs: [],
        },
        name: "tic-tac-toe",
        alicePubKey: "",
        bobPubKey: "",
        creator: player,
        player: "",
        date: new Date(),
      };

      if (player === "alice") {
        Object.assign(game, {
          alicePubKey: PlayerPublicKey.get("alice"),
        });
      } else {
        Object.assign(game, {
          bobPubKey: PlayerPublicKey.get("bob"),
        });
      }

      server.createGame(game);

      forceUpdate();
    }
  };

  const cancelBet = () => {
    server.deleteGame();
    updateStart(false);
    forceUpdate();
  };

  const onDeployed = async (game) => {
    console.log("onDeployed...");

    if (game && game.alicePubKey && game.bobPubKey) {
      fetchContract(game.alicePubKey, game.bobPubKey);
    }

    updateStart(true);
  };

  const onNext = async (game) => {
    //BOB SIGN
    console.log("onNext", game);
    forceUpdate();
  };

  async function fetchContract(alicePubKey, bobPubKey) {
    if (contractInstance === null && alicePubKey && bobPubKey) {
      let { contractClass: TictactoeContractClass } = await web3.loadContract(
        "/tic-tac-toe/tictactoe_release_desc.json"
      );

      let c = new TictactoeContractClass(
        new PubKey(toHex(alicePubKey)),
        new PubKey(toHex(bobPubKey)),
        true,
        new Bytes('000000000000000000')
      );


      updateContractInstance(c);
      console.log("fetchContract successfully");
      return c;
    }
    return contractInstance;
  }

  function setPlayersPublicKey() {
    console.log('setPlayersPublicKey ...')
    let wallet = web3.wallet

    if (wallet instanceof Sensilet) {
      return wallet.getPublicKey().then(async (publicKeyStr) => {
        let publicKey = bsv.PublicKey.fromHex(publicKeyStr)

        PlayerPublicKey.set(publicKeyStr, 'alice');
        PlayerAddress.set(publicKey.toAddress(), 'alice');

        PlayerPublicKey.set(publicKeyStr, 'bob');
        PlayerAddress.set(publicKey.toAddress(), 'bob');
      })
    } else if (wallet instanceof DotWallet) {
      return wallet.listUnspent(20000, {
        purpose: 'alice'
      }).then(async (utxos) => {

        if (utxos.length === 0) {
          throw new Error('no utxos');
        }

        let publicKey = bsv.PublicKey.fromHex(utxos[0].pubkey)

        PlayerPublicKey.set(utxos[0].pubkey, 'alice');
        PlayerAddress.set(publicKey.toAddress(), 'alice');

        PlayerPublicKey.set(utxos[0].pubkey, 'bob');
        PlayerAddress.set(publicKey.toAddress(), 'bob');
      })
    }
  }


  async function joinGame(game) {
    console.log("joinGame...", game);

    let balance = await web3.wallet.getbalance();

    if (balance <= game.amount) {
      alert(
        "no available utxos or  balance is not enough, please fund your wallet"
      );
      return;
    }


    Object.assign(game, {
      alicePubKey: PlayerPublicKey.get("alice"),
      player: "alice",
    });
    Object.assign(game, {
      bobPubKey: PlayerPublicKey.get("bob"),
      player: "bob",
    });



    let contract = await fetchContract(game.alicePubKey, game.bobPubKey);

    if (contract != null) {
      web3
        .deploy(contract, game.amount, PlayerPublicKey.get("bob"))
        .then(([tx, txid]) => {

          game.lastUtxo = {
            txHash: txid,
            outputIndex: 0,
            satoshis: tx.outputs[0].satoshis,
            script: tx.outputs[0].script,
          };

          game.tx = tx;
          game.deploy = txid;
          server.saveGame(game, "deployed");
          updateStart(true);
        })
        .catch((e) => {
          if (e.message === "no utxos") {
            alert("no available utxos, please fund your wallet");
          }
          console.error("deploy error", e);
        });
    }
  }

  async function startGame() {


    if (started) {
      console.log('already started')
      return;
    }
    console.log('startGame...')
    await setPlayersPublicKey();

    let game = server.getGame();
    if (game && game.lastUtxo) {
      updateStart(true);
    }

    if (game && game.alicePubKey && game.bobPubKey) {
      fetchContract(game.alicePubKey, game.bobPubKey);
    }

    if (game && !game.deploy) {
      joinGame(game);
    }

  }

  useEffect(() => {
    server.addDeployedListener(onDeployed);
    server.addNextListener(onNext);
    return () => {
      server.removeDeployedListener(onDeployed);
      server.removeNextListener(onNext);
    };
  }, [contractInstance]);

  const game = server.getGame();

  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          startBet={startBet}
          cancelBet={cancelBet}
          started={started}
          game={game}
        />

        <Game game={game} contractInstance={contractInstance} />

        <Wallet startGame={startGame}></Wallet>
      </header>
    </div>
  );
}

export default App;

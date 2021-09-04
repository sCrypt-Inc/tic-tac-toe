import "./App.css";
import Game from "./Game";
import React, { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { PubKey, toHex } from "scryptlib";

import { web3 } from "./web3";
import Wallet from "./wallet";
import server from "./Server";
import { DotWalletPublicKey } from "./utils";

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
          alicePubKey: DotWalletPublicKey.get("alice"),
        });
      } else {
        Object.assign(game, {
          bobPubKey: DotWalletPublicKey.get("bob"),
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
      );

      c.setDataPart("00000000000000000000");
      updateContractInstance(c);
      console.log("fetchContract successfully");
      return c;
    }
    return contractInstance;
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

    await web3.setAllPublicKey(20000);

    let player = server.getCurrentPlayer();

    // if (player === "alice") {
    Object.assign(game, {
      alicePubKey: DotWalletPublicKey.get("alice"),
      player: "alice",
    });
    // } else {
    Object.assign(game, {
      bobPubKey: DotWalletPublicKey.get("bob"),
      player: "bob",
    });
    // }

    let contract = await fetchContract(game.alicePubKey, game.bobPubKey);

    if (contract != null) {
      web3
        .deploy(contract, game.amount)
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

  useEffect(() => {
    if (!web3.wallet) {

    } else {
      let game = server.getGame();

      if (game && game.lastUtxo) {
        updateStart(true);
      }

      if (game && game.alicePubKey && game.bobPubKey) {
        fetchContract(game.alicePubKey, game.bobPubKey);
      }

      // let alicePrivateKey = server.getAlicePrivateKey();
      // let bobPrivateKey = server.getBobPrivateKey();
      // if (game && !game.deploy && alicePrivateKey && bobPrivateKey) {
      //   joinGame(game, alicePrivateKey, bobPrivateKey)
      // }
      if (game && !game.deploy) {
        joinGame(game);
      }
    }

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

        <Wallet></Wallet>
      </header>
    </div>
  );
}

export default App;

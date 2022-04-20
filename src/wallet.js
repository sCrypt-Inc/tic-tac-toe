import React, { useState, useEffect } from "react";
import { web3, DotWallet } from "./web3";
import server from "./Server";
import { getToken, getPlayer, PlayerPublicKey, PlayerAddress } from "./utils";
import { Sensilet } from "./web3/sensilet";
const Wallet = (props) => {
  const [balance, setBalance] = useState(0);
  const [authed, setAuth] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const dotwallet = new DotWallet();
      dotwallet.setToken(token);
    }
  }, []);

  useEffect(async () => {
    const id = setTimeout(async () => {
      if (!web3.wallet) {
        if (server.getAccessToken()) {
          const dotwallet = new DotWallet();
          web3.setWallet(dotwallet);
          props.startGame();
          setAuth(true);
        } else {
          const sensilet = new Sensilet();
          const isConnect = await sensilet.isConnect();

          if (isConnect) {
            web3.setWallet(sensilet);
            console.log("..... setAuth");
            props.startGame();
            setAuth(true);
          }
        }
      }

      if (web3.wallet) {
        web3.wallet.getbalance().then((balance) => {
          setBalance(balance);
        });
      }
    }, 1000);

    return () => clearTimeout(id);
  }, []);

  const handleDotwallet = (e) => {
    const dotwallet = new DotWallet();
    dotwallet.requestAccount(getPlayer());
  };

  const handleSensilet = async (e) => {
    try {
      const sensilet = new Sensilet();
      const res = await sensilet.requestAccount(getPlayer());
      if (res) {
        window.location.reload();
      }
    } catch (error) {
      console.error("requestAccount error", error);
    }
  };

  const handleExit = async (e) => {
    localStorage.clear();
    const sensilet = new Sensilet();

    const isConnect = await sensilet.isConnect();

    if (isConnect) {
      await sensilet.exitAccount();
    }

    web3.setWallet(undefined);
    setAuth(false);
    window.location.reload();
  };

  if (authed) {
    return (
      <div className="wallet">
        <div className="walletInfo">
          <div className="balance">
            <label>Balance: {balance}</label>
          </div>
          <button className="pure-button button-large" onClick={handleExit}>
            Logout
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="wallet">
        <div>
          <button
            className="pure-button button-large sensilet"
            onClick={handleSensilet}
          >
            Sensilet
          </button>
          <button
            className="pure-button button-large dotwallet"
            onClick={handleDotwallet}
          >
            Dotwallet
          </button>
        </div>
      </div>
    );
  }
};

export default Wallet;

import { useState, useEffect } from "react";
import { web3 } from "./web3";
import { SensiletWallet } from "./web3/sensiletwallet";

const Wallet = (props) => {
  const [balance, setBalance] = useState(0);

  useEffect(async () => {
    if (web3.wallet) {
      web3.wallet.getbalance().then((balance) => {
        setBalance(balance);
      });
    }
  }, []);



  const handleExit = async (e) => {
    const sensilet = new SensiletWallet();

    const isConnect = await sensilet.isConnect();

    if (isConnect) {
      await sensilet.exitAccount();
    }

    web3.setWallet(undefined);
    window.location.reload();
  };

    return (
      <div className="wallet">
        <div className="walletInfo">
          <div className="balance">
            <label>Balance: {balance} <span> (satoshis)</span></label>
          </div>
          <button className="pure-button button-large" onClick={handleExit}>
            Logout
          </button>
        </div>
      </div>
    );
};

export default Wallet;

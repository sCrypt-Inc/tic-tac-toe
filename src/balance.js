import { useState, useEffect } from "react";
import { SensiletProvider } from "scrypt-ts";
const Balance = (props) => {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  useEffect(() => {
    const  sensiletProvider = new SensiletProvider();

    sensiletProvider.getBalance().then(balance => setBalance(balance.total));

    sensiletProvider.getSigner().getDefaultAddress().then(address => {
      setAddress(address.toString())
    })

    sensiletProvider.getNetwork().then(network => {
      if(network.name === 'testnet') {
        setNetwork('Testnet')
      } else {
        setNetwork('Mainnet')
      }
    });

  }, []);

    return (
      <div className="wallet">
        <div className="walletInfo">
          <div className="balance">
            <label>Balance: {balance} <span> (satoshis)</span></label>
            <br></br>
            <label>NetWork: {network} </label>
            <br></br>
            <label>Address: {address} </label>
          </div>
        </div>
      </div>
    );
};

export default Balance;
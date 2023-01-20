import { useState, useEffect } from "react";
import { SensiletProvider, ProviderEvent } from "scrypt-ts";

const Balance = (props) => {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  useEffect(() => {
    const  sensiletProvider = new SensiletProvider();

    sensiletProvider.on(ProviderEvent.Connected, (provider) => {

      provider.getSigner().getBalance().then(balance => setBalance(balance.total));

      provider.getSigner().getDefaultAddress().then(address => {
        setAddress(address.toString())
      })
  
      provider.getNetwork().then(network => {
        if(network.name === 'testnet') {
          setNetwork('Testnet')
        } else {
          setNetwork('Mainnet')
        }
      });
    })

    sensiletProvider.connect()

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
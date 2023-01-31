import { useState, useEffect } from "react";

const Balance = (props) => {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  useEffect(() => {

    if(props.signer) {
      props.signer.getBalance().then(balance => setBalance(balance.total));
  
      props.signer.getDefaultAddress().then(address => {
        setAddress(address.toString())
      })
  
      props.signer.connectedProvider.getNetwork().then(network => {
        if(network.name === 'testnet') {
          setNetwork('Testnet')
        } else {
          setNetwork('Mainnet')
        }
      }); 
    }
    
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
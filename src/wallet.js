
import * as QRCode from 'qrcode.react';
import { bsv } from 'scryptlib';
import React, { useState, useEffect } from 'react';
import { web3, LocalWallet, NetWork, SignType } from './web3';
import { useInterval } from './hooks';
import server from './Server';

const Wallet = props => {

    const [address, setAddress] = useState('')
    const [balance, setBalance] = useState(0)

    useEffect(() => {

        if (web3.wallet) {
            web3.wallet.getRawChangeAddress().then(address => {
                setAddress(address)
            })

            web3.wallet.getbalance().then(balance => {
                setBalance(balance)
            })
        } else if (server.getPrivateKey()) {
            web3.setWallet(new LocalWallet(NetWork.Mainnet, server.getPrivateKey()));
            web3.wallet.getRawChangeAddress().then(address => {
                setAddress(address)
            })
        }
    });


    useInterval(() => {

        if (web3.wallet) {
            web3.wallet.getbalance().then(b => {
                console.log(`update balance old: ${balance} new: ${b}`)

                if (balance === 0 && b > 0) {
                    alert('Successfully deposit, try F5 to reload the page')
                }

                setBalance(b)
            })
        }

    }, 5000);


    const onClick = (e) => {

        try {
            const privateKey = new bsv.PrivateKey.fromRandom('mainnet')

            setAddress(privateKey.toAddress() + '')
            web3.setWallet(new LocalWallet(NetWork.Mainnet, privateKey.toWIF()));

            server.savePrivateKey(privateKey.toWIF());
        } catch (e) {
            console.log('wallet onChange error', e)
        }
    };


    const onWithdraw = async (e) => {

        try {

            const tx = {
                inputs: [],
                outputs: []
            };

            let withdrawAddress = document.getElementById('withdrawAddress').value;

            let address = new bsv.Address.fromString(withdrawAddress);

            if(address && address.type === 'pubkeyhash' && address.network.name === 'livenet') {
                console.log('adddress', address )
            } else {
                throw 'invalid bitcoin address';
            }
            
            let changeAddress = address + ''

            web3.wallet.listUnspent(0).then(utxos => {

                let total = 0 ;
                utxos.forEach(utxo => {
                    total += utxo.satoshis;
                    tx.inputs.push(
                        {
                            utxo: utxo,
                            script: '',
                            sequence: 0
                        }
                    );
                })

                const FEE = 500;
                const changeAmount = total - FEE;

                if (changeAmount <= 0) {
                    throw new Error('fund is not enough');
                }

                //add change output

                tx.outputs.push(
                    {
                        script: bsv.Script.buildPublicKeyHashOut(changeAddress).toHex(),
                        satoshis: changeAmount
                    }
                );

                return tx;
            })
            .then(tx => {
                //alice sign

                tx.inputs.forEach(async (input, index) => {
                    let unlockscript = await web3.wallet.signRawTransaction(tx, index, SignType.ALL);

                    tx.inputs[index].script = unlockscript;

                })
  
                return tx;
            }).then(tx => {
                console.log('send tx', tx)
                return web3.sendTx(tx);
            }).then(txid => {
                console.log('console txid', txid)
            }).catch(e => {
                alert('withdraw error ' + e)
            })
        
    } catch(e) {
        alert('withdraw error ' + e)
    }

}



    if (web3.wallet) {
        return <div className="wallet">

            <div className="walletInfo">
                <div className="address" >
                    <label>Address: {address}</label>
                </div>

                <div className="balance">
                    <label >Balance: {balance}</label>
                </div>

                <div className="fundtips">
                    <label >You can fund the address with your wallet</label>
                    <br></br>
                    <label className="warnning">Warnning: please do not fund it with too much coin.</label>
                    
                </div>
                <div className="withdraw" >
                    <input id="withdrawAddress" placeholder="Bitcoin Address" type='text' ></input>
                    <button  onClick={onWithdraw}>Withdraw Fund</button>
                </div>
               
            </div>
            <div className="walletqrcode">
                <QRCode value={address} ></QRCode>
            </div>

        </div>
    } else {
        return <div className="wallet">
            <button className="pure-button button-large" onClick={onClick}>Create Wallet</button>
        </div>
    }

}

export default Wallet;




import * as QRCode from 'qrcode.react';
import { web3, LocalWallet, NetWork, bsv } from 'scryptlib';
import React, { useState, useEffect } from 'react';

import { useInterval, forceUpdate } from './hooks';
import server from './Server';

const Wallet = props => {

    const [address, setAddress] = useState('')
    const [balance, setBalance] = useState(0)

    useEffect(() => {

        if (web3.wallet) {
            web3.wallet.changeAddress().then(address => {
                setAddress(address)
            })

            web3.wallet.balance().then(balance => {
                setBalance(balance)
            })
        } else if (server.getPrivateKey()) {
            web3.setWallet(new LocalWallet(NetWork.Testnet, server.getPrivateKey()));
            props.updateWallet()
        }
    });


    useInterval(() => {

        if (web3.wallet) {
            web3.wallet.balance().then(balance => {
                console.log('update balance ', balance)
                setBalance(balance)
            })
        }

    }, 5000);


    const onChange = (e) => {

        try {
            const privateKey = new bsv.PrivateKey.fromWIF(e.currentTarget.value);

            if (privateKey && privateKey.network.name === "testnet") {
                web3.setWallet(new LocalWallet(NetWork.Testnet, e.currentTarget.value));

                server.savePrivateKey(e.currentTarget.value);
                props.updateWallet()
            }
        } catch (e) {
            console.log('wallet onChange error', e)
        }
    };





    if (web3.wallet) {
        return <div className="wallet">
            <div>
                <QRCode value={address}></QRCode>
            </div>

            <div className="">
                <label htmlFor="amount">Address: {address} </label>
            </div>

            <div className="">
                <label htmlFor="amount">Amount: </label>
                <button id="amount" name="amount" >
                    {balance}
                </button>
            </div>
        </div>
    } else {
        return <div className="wallet">
            <label htmlFor="key">create wallet:
                        <input type="text" name="key" placeholder="Import your testnet Private Key" onChange={onChange} />
            </label>
        </div>
    }

}

export default Wallet;



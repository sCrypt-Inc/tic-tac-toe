
import * as QRCode from 'qrcode.react';
import { bsv } from 'scryptlib';
import React, { useState, useEffect } from 'react';
import { web3, LocalWallet, NetWork } from './web3';
import { useInterval, forceUpdate } from './hooks';
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
            web3.setWallet(new LocalWallet(NetWork.Testnet, server.getPrivateKey()));
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
            const privateKey = new bsv.PrivateKey.fromRandom('testnet')

            setAddress(privateKey.toAddress() + '')
            web3.setWallet(new LocalWallet(NetWork.Testnet, privateKey.toWIF()));

            server.savePrivateKey(privateKey.toWIF());
        } catch (e) {
            console.log('wallet onChange error', e)
        }
    };





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
                    <label >You can fund the address with <a href="https://faucet.bitcoincloud.net" target="_blank"><span> faucets</span></a></label>
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



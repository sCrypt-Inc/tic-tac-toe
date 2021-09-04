
import React, { useState, useEffect } from 'react';
import { web3, DotWallet} from './web3';
import server from './Server';
import {getCode, getPlayer} from './utils';

const Wallet = props => {
    const [balance, setBalance] = useState(0)
    const [authed, setAuth] = useState(false)

    useEffect(()=>{
        const dw = new DotWallet()
        dw.code2token(getCode())
    },[])

    useEffect(() => {

        if (!web3.wallet) {
            if (server.getAccessToken()) {
                web3.setWallet(new DotWallet());
                setAuth(true)
            }
        }  

        if(web3.wallet) {
            web3.wallet.getbalance().then(balance => {
                setBalance(balance)
            })
        }

    },[]);


    const handleAuth = (e)=>{
        new DotWallet().requestAccount(getPlayer())
    }


    if (authed) {
        return <div className="wallet">
            <div className="walletInfo">
                <div className="balance">
                    <label >Balance: {balance}</label>
                </div>
            </div>
        </div>
    } else {
        return <div className="wallet">
            <button className="pure-button button-large" onClick={handleAuth}>Login dotwallet</button>
        </div>
    }
}

export default Wallet;



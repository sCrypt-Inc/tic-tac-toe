
import React, { useState, useRef, useEffect } from 'react';

import { web3 } from './web3';


function TitleBar(props) {

    const amountRef = useRef(null);

    const onStart = async (e) => {

        if (!web3.wallet) {
            alert("Pelease create wallet first")
            return;
        }
        let amount = parseInt(amountRef.current.value);

        // if (amount < 20000) {
        //     alert("invalid amount, at least 20000 satoshis")
        //     return;
        // }

        if (!isNaN(amount)) {

            let balance = await web3.wallet.getbalance();
        
            if (amount > balance) {
                alert("Not enough funds. Please fund your wallet address first");
                return;
            }

            props.startBet(amount);
        } else {
            console.error(`${amountRef.current.value} is not number`)
        }
    }

    const onCancel = (e) => {
        props.cancelBet();
    }


    if (props.started) {
        return (
            <div>
                The game is in progress ...
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );
    } else {
        return (
            <div>
                <label>Bet amount:
                    <input ref={amountRef} type="number" name="amount" min="1" defaultValue={1} placeholder="in satoshis" />
                </label>
                <button className="start" onClick={onStart}>Start</button>
            </div>
        );
    }
}

export default TitleBar;

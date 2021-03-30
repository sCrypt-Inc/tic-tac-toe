
import React, { useState, useRef, useEffect } from 'react';
import { web3, LocalWallet, NetWork, bsv, PubKey, toHex, Tx, SignType } from 'scryptlib';
import server from './Server';

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


function TitleBar(prop) {
    const forceUpdate = React.useReducer(bool => !bool)[1];

    const amountRef = useRef(null);

    const onStart = (e) => {

        if (!web3.wallet) {
            alert("Pelease create wallet first")
            return;
        }
        let amount = parseInt(amountRef.current.value);

        if (amount < 10000) {
            alert("The bet fund is too small to play, at least 10000")
            return;
        }

        if (!isNaN(amount)) {
            prop.startBet(amount);
        } else {
            console.error(`${amountRef.current.value} is not number`)
        }
    }

    const onCancel = (e) => {
        prop.cancelBet();
    }






    useEffect(() => {

    })

    if (prop.started) {

        return (
            <div>
                The game is in progress ...
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );
    }
    else if (server.existGamebySelf()) {
        return (
            <div>
                Waiting  Bob join the game ...
                <a className="pure-button" href={window.location.href + '?player=bob'} target="_blank"> Join</a>
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );

    } else if (server.existGamebyOther()) {

        return (
            <div>
                Joining the game...
            </div>
        );
    }
    else {
        return (
            <div>
                <label>Bet amount:
                    <input ref={amountRef} type="number" name="amount" placeholder="in satoshis" />
                </label>
                <button className="start" onClick={onStart}>Start Bet</button>
            </div>
        );
    }
}

export default TitleBar;

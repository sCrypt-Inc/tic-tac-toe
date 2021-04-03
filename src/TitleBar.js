
import React, { useState, useRef, useEffect } from 'react';

import { web3 } from './web3';
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


function TitleBar(props) {
    const forceUpdate = React.useReducer(bool => !bool)[1];

    const amountRef = useRef(null);

    const onStart = (e) => {

        if (!web3.wallet) {
            alert("Pelease create wallet first")
            return;
        }
        let amount = parseInt(amountRef.current.value);

        if (amount < 20000) {
            alert("The bet fund is too small to play, at least 20000")
            return;
        }

        if (!isNaN(amount)) {
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
    }
    else if (props.game && props.game.creator === server.getCurrentPlayer()) {

        const player = server.getCurrentPlayer() === 'alice' ? 'bob' : 'alice';

        var url = window.location.href.split('?')[0];

        return (
            <div>
                Waiting someone join the game ...
                <a className="pure-button" href={url + '?player=' + player} target="_blank"> Join</a>
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );

    } else if (props.game && props.game.creator !== server.getCurrentPlayer()) {

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

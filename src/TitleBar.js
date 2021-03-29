
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
        let amount = parseInt(amountRef.current.value);

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
                正在游戏
                <a href={`https://test.whatsonchain.com/tx/${prop.game ? prop.game.deploy : ""}`} target="_blank"> 下注合约</a>
                <button className="cancel" onClick={onCancel}>取消</button>
            </div>
        );
    }
    else if (server.existGamebySelf()) {
        return (
            <div>
                等待对方加入游戏 ...
                <a href={window.location.href + '?player=bob'} target="_blank"> 加入</a>
                <button className="cancel" onClick={onCancel}>取消</button>
            </div>
        );

    } else if (server.existGamebyOther()) {

        return (
            <div>
                加入游戏...
            </div>
        );
    }
    else {
        return (
            <div>
                <label>金额:
                    <input ref={amountRef} type="text" name="amount" />
                </label>
                <button className="start" onClick={onStart}>开始</button>
            </div>
        );
    }
}

export default TitleBar;

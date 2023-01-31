
import React, { useRef } from 'react';

export const GameStatus = {
    "wait":1,
    "progress":2,
    "over":3
}

function TitleBar(props) {

    const amountRef = useRef(null);

    const onStart = async (e) => {

        let amount = parseInt(amountRef.current.value);

        if (amount < 30000) {
            alert("invalid amount, at least 30000 satoshis")
            return;
        }

        if (!isNaN(amount)) {
            const isConnected = await props.signer.isSensiletConnected()
            if(isConnected) {
                const balance = await props.signer.getBalance();

                if (amount > balance.confirmed + balance.unconfirmed) {
                    alert("Not enough funds. Please fund your wallet address first");
                    return;
                }
                props.onStart(amount);
            } else {
                alert("Please connect sensilet wallet first!");
            }

   
        } else {
            console.error(`${amountRef.current.value} is not number`)
        }
    }

    const onCancel = (e) => {
        props.onCancel();
    }


    if (props.gameStatus === GameStatus.progress) {
        return (
            <div>
                The game is in progress ...
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );
    } else if (props.gameStatus === GameStatus.over) {
        return (
            <div>
                The game is over.
                <button className="pure-button cancel" onClick={onCancel}>Restart</button>
            </div>
        );
    } else {
        return (
            <div>
                <label>Bet amount:
                    <input ref={amountRef} type="number" name="amount" min="1" defaultValue={30000} placeholder="in satoshis" />
                </label>
                <button className="start" onClick={onStart}>Start</button>
            </div>
        );
    }
}

export default TitleBar;

import React, { useRef } from "react";

function TitleBar(props: any) {
  const amountRef = useRef<any>(null);

  const onStart = async () => {
    let amount = parseInt(amountRef.current.value);

    if (!isNaN(amount)) {
      props.onStart(amount);
    } else {
      console.error(`${amountRef.current.value} is not number`);
    }
  };

  const onCancel = () => {
    props.onCancel();
  };

  if (props.started) {
    return (
      <div>
        The game is in progress ...
        <button className="pure-button cancel" onClick={onCancel}>
          Restart
        </button>
      </div>
    );
  } else {
    return (
      <div>
        <label>
          Bet amount:
          <input
            ref={amountRef}
            type="number"
            name="amount"
            min="1"
            defaultValue={2}
            placeholder="in satoshis"
          />
        </label>
        <button className="start" onClick={onStart}>
          Start
        </button>
      </div>
    );
  }
}

export default TitleBar;

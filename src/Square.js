import React from 'react';

const Square = props => {



  let tx = props.value ? `https://test.whatsonchain.com/tx/${props.value.tx}` : "";

  return (<button className={`${props.winnerClass} square`} onClick={props.onClick}>
    {props.value ? <a href={tx} target="_blank" title="Click to see the transaction">{props.value.label}</a> : props.value}
  </button>)

}

export default Square;

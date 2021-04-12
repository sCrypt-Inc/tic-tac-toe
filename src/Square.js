import React from 'react';

const Square = props => {



  let tx = props.value ? `https://whatsonchain.com/tx/${props.value.tx}` : "";
  let icon = props.value ? <div className='squareicon'>{props.value.n}</div> : "";
  return (
    <div className="squarewapper">
      <button className={`${props.winnerClass} square`} onClick={props.onClick}>
        {props.value ? <a href={tx} target="_blank" title="Click to see the transaction">{props.value.label}</a> : props.value}
      </button>
      {icon}
    </div>

  )

}

export default Square;

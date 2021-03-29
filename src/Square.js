import React from 'react';

const Square = props => (
  <button className={`${props.winnerClass} square`} onClick={props.onClick}>
    {props.value ? props.value.label : props.value}
  </button>
);

export default Square;

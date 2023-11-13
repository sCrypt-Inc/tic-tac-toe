import { SquareData } from "./types";

const Square = (props: any) => {

  const squaredata = props.value as SquareData | null;

  let tx = squaredata?.tx ? `https://test.whatsonchain.com/tx/${props.value.tx}` : "";
  return (
    <div className="square-wrapper">
      <button className={`${props.winnerClass} square`} onClick={props.onClick}>
        {squaredata ? <a href={tx} target="_blank" title="Click to see the transaction" rel="noreferrer">{squaredata.label}</a> : undefined}
      </button>
      {
        squaredata ? <div className='squareicon'>{squaredata.n}</div> : undefined
      }
    </div>
  )
}

export default Square;

import Square from './Square';



function Board(props: any) {

  function createBoard(row: number, col: number) {
    const board = [];
    let cellCounter = 0;

    for (let i = 0; i < row; i += 1) {
      const columns = [];
      for (let j = 0; j < col; j += 1) {
        columns.push(renderSquare(cellCounter++));
      }
      board.push(<div key={i} className="board-row">{columns}</div>);
    }

    return board;
  }

  function renderSquare(i: number) {

    const winnerClass =
      props.winnerSquares &&
        (props.winnerSquares[0] === i ||
          props.winnerSquares[1] === i ||
          props.winnerSquares[2] === i)
        ? 'square--green'
        : '';

    return (
      <Square
        winnerClass={winnerClass}
        key={i}
        value={props.squares[i]}
        onClick={() => props.onClick(i)}
      />
    );
  }

  return <div>{createBoard(3, 3)}</div>;

}

export default Board;

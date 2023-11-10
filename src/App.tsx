import "./App.css";
import Game from "./Game";
import { useState, useRef } from "react";
import TitleBar from "./TitleBar";
import { DefaultProvider, SensiletSigner, PubKey, toHex } from "scrypt-ts";
import { TicTacToe } from "./contracts/tictactoe";
const initialGameData = {
  amount: 0,
  name: "tic-tac-toe",
  date: new Date(),
  history: [
    {
      squares: Array(9).fill(null),
    },
  ],
  currentStepNumber: 0,
  isAliceTurn: true,
  start: false
}

function App() {

  const [gameData, setGameData] = useState(initialGameData);
  const [isConnected, setConnected] = useState(false);

  const signerRef = useRef<SensiletSigner>();
  const [contract, setContract] = useState<TicTacToe | undefined>(undefined)
  const [deployedTxId, setDeployedTxId] = useState<string>("")
  const [alicePubkey, setAlicePubkey] = useState("");
  const [bobPubkey, setBobPubkey] = useState("");
  const [alicebalance, setAliceBalance] = useState(0);
  const [bobbalance, setBobBalance] = useState(0);

  const startGame = async (amount: number) => {

    if (!isConnected || !alicePubkey || !bobPubkey) {
      setConnected(false)
      alert("Please connect wallet first.")
      return
    }



    try {
      const signer = signerRef.current as SensiletSigner;


      const instance = new TicTacToe(
        PubKey(toHex(alicePubkey)),
        PubKey(toHex(bobPubkey))
      )

      await instance.connect(signer);

      const tx = await instance.deploy(amount);

      setDeployedTxId(tx.id)

      setContract(instance)

      setGameData(Object.assign({}, gameData, {
        start: true
      }))
    } catch (e) {
      console.error('Deploying TicTacToe failed.', e)
      alert('Deploying TicTacToe failed.')
    }

  };

  const cancelGame = async () => {
    setGameData(Object.assign({}, gameData, initialGameData))
  };

  const sensiletLogin = async () => {
    console.log('sensiletLogin...')
    try {
      const provider = new DefaultProvider();
      const signer = new SensiletSigner(provider);

      signerRef.current = signer;

      const { isAuthenticated, error } = await signer.requestAuth()
      if (!isAuthenticated) {
        throw new Error(error)
      }

      const pubkey = await signer.getDefaultPubKey();
      const changeAccountMessage = "Please change your account in Sensilet wallet, click again to get bob PublicKey";

      if (!alicePubkey) {

        setAlicePubkey(toHex(pubkey))

        signer.getBalance().then(balance => {
          setAliceBalance(balance.confirmed + balance.unconfirmed)
        })

        alert(changeAccountMessage)

      } else {
        if (toHex(pubkey) !== alicePubkey) {
          setBobPubkey(toHex(pubkey))

          signer.getBalance().then(balance => {
            setBobBalance(balance.confirmed + balance.unconfirmed)
          })

          setConnected(true);
        } else {
          alert(changeAccountMessage)
        }
      }

    } catch (error) {
      console.error("sensiletLogin failed", error);
      alert("sensiletLogin failed")
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h2>Play Tic-Tac-Toe on Bitcoin</h2>
        <TitleBar
          onStart={startGame}
          onCancel={cancelGame}
          started={gameData.start}
        />
        <Game gameData={gameData} 
        setGameData={setGameData} 
        deployedTxId={deployedTxId} 
        contract={contract} 
        setContract={setContract}
        alicePubkey={alicePubkey}
        bobPubkey={bobPubkey} />

        {
          isConnected ?
          <div>
            <label>Alice Balance: {alicebalance} <span> (satoshis)</span></label>
            <br/>
            <label>Bob Balance: {bobbalance}  <span> (satoshis)</span></label>
          </div>
            :
            <button
              className="pure-button button-large sensilet"
              onClick={sensiletLogin}
            >
              Connect Wallet
            </button>
        }
      </header>
    </div>
  );
}

export default App;

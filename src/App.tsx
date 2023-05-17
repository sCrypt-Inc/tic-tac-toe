import "./App.css";
import Game from "./Game";
import { useState, useRef, useEffect } from "react";
import TitleBar from "./TitleBar";
import { DefaultProvider, PubKey, toHex, DotwalletSigner } from "scrypt-ts";
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
  start: false,
};

function App() {
  const [gameData, setGameData] = useState(initialGameData);
  const [isConnected, setConnected] = useState(false);

  const [contract, setContract] = useState<TicTacToe | undefined>(undefined);
  const [deployedTxId, setDeployedTxId] = useState<string>("");
  const [alicePubkey, setAlicePubkey] = useState("");
  const [bobPubkey, setBobPubkey] = useState("");
  const [alicebalance, setAliceBalance] = useState(0);
  const [bobbalance, setBobBalance] = useState(0);

  const provider = new DefaultProvider();

  const state = localStorage.getItem("state")
    ? (localStorage.getItem("state") as string)
    : crypto.randomUUID();

  localStorage.setItem("state", state);

  const accessToken = localStorage.getItem("access_token");

  const options = accessToken
    ? { accessToken }
    : {
        client_id: "c152e571fffb163bc99bb87c51577354",
        client_secret: "243720bb8bb573b3f07f6ba2838f4478",
        redirect_uri: `${window.location.origin}/tic-tac-toe/`,
        state: state,
      };

  const signerRef = useRef(new DotwalletSigner(options, provider));

  const signer = signerRef.current;

  useEffect((login = walletLogin) => {
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get("state");

    if (state && state === localStorage.getItem("state")) {
      login();
    } else if (accessToken) {
      login();
    }
  }, []);

  const startGame = async (amount: number) => {
    if (!isConnected || !alicePubkey || !bobPubkey) {
      setConnected(false);
      alert("Please connect wallet first.");
      return;
    }

    try {
      const instance = new TicTacToe(
        PubKey(toHex(alicePubkey)),
        PubKey(toHex(bobPubkey))
      );

      await instance.connect(signer);

      const tx = await instance.deploy(amount);

      setDeployedTxId(tx.id);

      setContract(instance);

      setGameData(
        Object.assign({}, gameData, {
          start: true,
        })
      );
    } catch (e) {
      console.error("deploy TicTacToe failes", e);
      alert("deploy TicTacToe failes");
    }
  };

  const cancelGame = async () => {
    setGameData(Object.assign({}, gameData, initialGameData));
  };

  const walletLogin = async () => {
    try {
      const { isAuthenticated, error } = await signer.requestAuth();
      if (!isAuthenticated) {
        throw new Error(error);
      }

      const pubkey = await signer.getDefaultPubKey();

      setAlicePubkey(toHex(pubkey));

      setBobPubkey(toHex(pubkey));

      const balance = await signer.getBalance();

      setAliceBalance(balance.confirmed + balance.unconfirmed);
      setBobBalance(balance.confirmed + balance.unconfirmed);
      setConnected(true);
    } catch (error) {
      console.error("sensiletLogin failed", error);
      alert("sensiletLogin failed");
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
        <Game
          gameData={gameData}
          setGameData={setGameData}
          deployedTxId={deployedTxId}
          contract={contract}
          setContract={setContract}
          alicePubkey={alicePubkey}
          bobPubkey={bobPubkey}
        />

        {isConnected ? (
          <div>
            <label>
              Alice Balance: {alicebalance} <span> (satoshis)</span>{" "}
            </label>
            <br />
            <label>
              Bob Balance: {bobbalance} <span> (satoshis)</span>
            </label>
          </div>
        ) : (
          <button
            className="pure-button button-large sensilet"
            onClick={walletLogin}
          >
            Connect Wallet
          </button>
        )}
      </header>
    </div>
  );
}

export default App;

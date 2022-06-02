import { toHex, bsv } from "scryptlib";


export const Player = {
  Alice: 'alice',
  Bob: 'bob'
};

// store alice and bob's Privkey
export const PlayerPrivkey = {
  get: (player) => {
    return localStorage.getItem(player);
  },
  set: (player, key) => {
    localStorage.setItem(player, key);
  },
};

// store alice and bob's PublicKey, readonly
export const PlayerPublicKey = {
  get: (player) => {
    const key = PlayerPrivkey.get(player);
    const privateKey = new bsv.PrivateKey.fromWIF(key);
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
    return toHex(publicKey);
  }
};

// store alice and bob's PublicKey Address, readonly
export const PlayerAddress = {
  get: (player) => {
    const key = PlayerPrivkey.get(player);
    const privateKey = new bsv.PrivateKey.fromWIF(key);
    return privateKey.toAddress().toString();
  }
};

// store current player
export const CurrentPlayer = {
  get: () => {
    return localStorage[`player`] || Player.Alice;
  },
  set: (player) => {
    localStorage.setItem(`player`, player);
  },
};

// Randomly generated alice and bob privateKey
export const initPlayer = () => {

  const alice = PlayerPrivkey.get(Player.Alice);

  if(!alice) {
    const aliceKey = new bsv.PrivateKey.fromRandom();
    PlayerPrivkey.set(Player.Alice, aliceKey.toWIF())
  }

  const bob = PlayerPrivkey.get(Player.Bob);

  if(!bob) {
    const bobKey = new bsv.PrivateKey.fromRandom();
    PlayerPrivkey.set(Player.Bob, bobKey.toWIF())
  }
}

// store game data
export const GameData = {
  get: () => {
    const gameStr = localStorage[`game`];
    return gameStr ? JSON.parse(gameStr) : {};
  },
  set: (game) => {
    localStorage.setItem(`game`, JSON.stringify(game));
  },
  update: (game) => {
    const now = GameData.get();
    localStorage.setItem(`game`, JSON.stringify(Object.assign(now, game)));
  },
  clear: () => {
    localStorage.setItem(`game`, JSON.stringify({}));
  },
};


// store all utxos related to the contract
export const ContractUtxos = {
  add: (rawTx, outputIndex = 0) => {
    const tx = new bsv.Transaction(rawTx);
    const utxos = ContractUtxos.get();
    const utxo = {
      utxo: {
        txId: tx.id,
        outputIndex: outputIndex,
        satoshis: tx.outputs[outputIndex].satoshis,
        script: tx.outputs[outputIndex].script.toHex()
      },
      rawTx: rawTx
    };
    utxos.push(utxo)
    ContractUtxos.set(utxos)

    return utxo;
  },
  get: () => {
    const utxosStr = localStorage[`utxos`];
    return utxosStr ? JSON.parse(utxosStr) : [];
  },
  set: (utxos) => {
    localStorage.setItem(`utxos`, JSON.stringify(utxos));
  },
  clear: () => {
    localStorage.setItem(`utxos`, JSON.stringify([]));
  },
  getlast: () => {
    const utxos = ContractUtxos.get();
    return utxos[utxos.length - 1];
  },

  getdeploy: () => {
    const utxos = ContractUtxos.get();
    return utxos[0];
  },
};


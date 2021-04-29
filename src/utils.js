export const LocalStorageKey = {
  // bob
  accountTokenBob : "access_token_bob",
  refreshTokenBob : "refresh_token_bob",
  publicKeyBob : "public_key_bob",
  addressBob : "address_bob",
  userBob : "user_bob",
  // alice
  accountTokenAlice : "access_token_alice",
  refreshTokenAlice : "refresh_token_alice",
  publicKeyAlice : "public_key_alice",
  addressAlice : "address_alice",
  userAlice : "user_alice",
}

// 测试环境开放平台
// const host = "http://192.168.1.13:6001";

export const DAPP_API_PATHS = {
  dapp_list_unspent: `/v1/grandet_dapp/dapp_list_unspent`,
  dapp_sign_raw_transaction: `/v1/grandet_dapp/dapp_sign_raw_transaction`,
  dapp_get_signature: `/v1/grandet_dapp/dapp_get_signature`,
  dapp_get_balance: `/v1/grandet_dapp/dapp_get_balance`,
  dapp_send_raw_transaction: `/v1/grandet_dapp/dapp_send_raw_transaction`,
  dapp_get_raw_change_address: `/v1/grandet_dapp/dapp_get_raw_change_address`,
  dapp_get_public_key: `/v1/grandet_dapp/dapp_get_public_key`,
  get_access_token:`/v1/oauth2/get_access_token`
};

export const CLIENT_ID = "ce7ac9b5c4d54c7f9e71ed3e9a732c12";

// 通过URL判断是哪个玩家
export const getPlayer = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("player") || "alice";
};

// 通过URL判断是哪个玩家
export const getPlayerByState = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("state") || "alice";
};

export const getCode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("code");
};

export const DotWalletToken = {
  get: () => {
    const player = getPlayer();
    const key =
      player === "alice"
        ? LocalStorageKey.accountTokenAlice
        : LocalStorageKey.accountTokenBob;
    return localStorage.getItem(key);
  },
  set: (accessToken) => {
    const player = getPlayer();
    const key =
      player === "alice"
        ? LocalStorageKey.accountTokenAlice
        : LocalStorageKey.accountTokenBob;
    localStorage.setItem(key, accessToken);
  },
};

export const DotWalletPublicKey = {
  get: () => {
    const player = getPlayer();
    const key =
      player === "alice"
        ? LocalStorageKey.publicKeyAlice
        : LocalStorageKey.publicKeyBob;
    return localStorage.getItem(key);
  },
  set: (publicKey,player) => {
    if(player){
      localStorage[`public_key_${player}`] = publicKey;
      return ;
    }
    const key =
      player === "alice"
        ? LocalStorageKey.publicKeyAlice
        : LocalStorageKey.publicKeyBob;
    localStorage.setItem(key, publicKey);
  },
};

export const DotWalletAddress = {
  get: () => {
    const player = getPlayer();
    const key =
      player === "alice"
        ? LocalStorageKey.addressAlice
        : LocalStorageKey.addressBob;
    return localStorage.getItem(key);
  },
  set: (address,player) => {
    if(player){
      localStorage[`address_${player}`] = address;
      return ;
    }
    const key =
      player === "alice"
        ? LocalStorageKey.addressAlice
        : LocalStorageKey.addressBob;
    localStorage.setItem(key, address);
  },
};


// export const DotWalletUser = {
//   get: () => {
//     const player = getPlayer();
//     const key =
//       player === "alice" ? LocalStorageKey.userAlice : LocalStorageKey.userBob;

//     const userStr = localStorage.getItem(key);

//     try {
//       return userStr ? (JSON.parse(userStr) as IUser) : null;
//     } catch (error) {
//       return null;
//     }
//   },
//   set: (user: IUser) => {
//     const player = getPlayer();
//     const key =
//       player === "alice" ? LocalStorageKey.userAlice : LocalStorageKey.userBob;

//     localStorage.setItem(key, JSON.stringify(user));
//   },
// };
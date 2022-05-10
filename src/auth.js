import { SensiletWallet } from "./web3/sensiletwallet";

const Auth = (props) => {

  const sensiletLogin = async (e) => {
    try {
      const sensilet = new SensiletWallet();
      const res = await sensilet.requestAccount("tic-tac-toe");
      if (res) {
        window.location.reload();
      }
    } catch (error) {
      console.error("requestAccount error", error);
    }
  };

  return (
    <div className="auth">
      <div>
        <button
          className="pure-button button-large sensilet"
          onClick={sensiletLogin}
        >
          Sensilet
        </button>
      </div>
    </div>
  );
};

export default Auth;

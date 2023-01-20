import { SensiletProvider } from "scrypt-ts";

const Auth = (props) => {

  const sensiletLogin = async (e) => {
    try {

      const provider = new SensiletProvider();
      await provider.connect();
      window.location.reload();
    } catch (error) {
      console.error(error);
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

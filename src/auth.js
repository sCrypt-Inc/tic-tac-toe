const Auth = (props) => {

  const sensiletLogin = async (e) => {
    try {

      if(props.signer) {
        await props.signer.getConnectedTarget();
        window.location.reload();
      }

    } catch (error) {
      console.error("sensiletLogin failed", error);
    }
  };

  return (
    <div className="auth">
      <div>
        <button
          className="pure-button button-large sensilet"
          onClick={sensiletLogin}
        >
          Connect Sensilet
        </button>
      </div>
    </div>
  );
};

export default Auth;

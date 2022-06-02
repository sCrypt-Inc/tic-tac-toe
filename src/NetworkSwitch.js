import React, { Component } from "react";
import Switch from "react-switch";
import { CurrentNetwork } from "./storage";
import { NetWork } from "./web3";

class NetworkSwitch extends Component {
    constructor() {
        super();
        this.state = { isTestNet: CurrentNetwork.get() === NetWork.Testnet };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(checked) {
        CurrentNetwork.switch();
        this.setState({ isTestNet: CurrentNetwork.get() === NetWork.Testnet });
        window.location.reload();
    }

    render() {
        return (
            <div className="App-settings">
                <label>
                    <span>{this.state.isTestNet ? "TestNet"  : "MainNet"}</span>
                    <Switch onChange={this.handleChange} checked={this.state.isTestNet}
                        onColor="#86d3ff"
                        onHandleColor="#2693e6"
                        handleDiameter={30}
                        uncheckedIcon={false}
                        checkedIcon={false}
                        boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                        activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                        height={30}
                        width={60}
                        className="react-switch" />
                </label>
            </div>
        );
    }
}

export default NetworkSwitch;

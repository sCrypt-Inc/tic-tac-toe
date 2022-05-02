
import { EventEmitter } from 'events';
import { DotWalletToken } from './utils';

class Server extends EventEmitter {
    player = ''
    privKey = ''
    accessToken = ''
    constructor() {
        super();
        var urlParams = new URLSearchParams(window.location.search);
        this.player = urlParams.get('player') || "alice";
        const self = this;
        this.accessToken = DotWalletToken.get()

        window.addEventListener('storage', (e) => {
            // When local storage changes, dump the list to
            // the console.

            if (e.key === "game") {
                try {
                    let gameJson = window.localStorage.getItem('game');
                    if (gameJson && gameJson !== null) {
                        let game = JSON.parse(gameJson);

                        if (game.event) {

                            self.emit(game.event, game)
                        }

                    }
                } catch (e) {
                    console.error(' storage change error', e)
                }
            }

        }, false);

    }



    deleteGame = () => {
        window.localStorage.removeItem('game');
    }


    createGame = (game) => {
        game.event = 'createGame';
        return window.localStorage.setItem('game', JSON.stringify(game));
    }

    saveGame = (game, event) => {
        game.event = event;
        window.localStorage.setItem('game', JSON.stringify(game));
    }



    getGame = () => {
        let gameJson = window.localStorage.getItem('game');
        if (gameJson && gameJson !== null) {
            return JSON.parse(gameJson);
        }
        return undefined
    }
    


    getCurrentPlayer = () => (this.player);


    savePrivateKey = (key) => {
        this.privKey = key;
        window.localStorage.setItem(this.player, key);
    }


    getPrivateKey = () => {
        if (this.player) {
            this.privKey = window.localStorage.getItem(this.player);
        }

        return this.privKey;
    }

    getBobPrivateKey = () => {

        return window.localStorage.getItem('bob');
    }

    getAlicePrivateKey = () => {

        return window.localStorage.getItem('alice');
    }

    getAccessToken = () => {
        if (this.player) {
            this.accessToken = DotWalletToken.get();
        }

        return this.accessToken;
    }

    addDeployedListener(cb) {
        this.on('deployed', cb);
    }


    removeDeployedListener(cb) {
        this.off('deployed', cb)
    }


    addNextListener(cb) {
        this.on('next', cb);
    }

    removeNextListener(cb) {
        this.off('next', cb)
    }
}

const server = new Server();

export default server;
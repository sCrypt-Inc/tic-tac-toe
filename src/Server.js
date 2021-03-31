
import { EventEmitter } from 'events';

class Server extends EventEmitter {
    player = ''
    privKey = ''
    constructor() {
        super();
        var urlParams = new URLSearchParams(window.location.search);
        this.player = urlParams.get('player') || "alice";
        const self = this;
        window.addEventListener('storage', (e) => {
            // When local storage changes, dump the list to
            // the console.
            console.log('on storage change ' + this.player, e)


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

    existGamebySelf = () => {

        let game = window.localStorage.getItem('game');

        if (game && game !== null) {
            game = JSON.parse(game);
            if (game.creator && game.creator === this.player) {
                return game;
            }
        }

        return undefined;
    }

    existGamebyOther = () => {

        let game = window.localStorage.getItem('game');

        if (game && game !== null) {
            game = JSON.parse(game);
            if (game.creator && game.creator !== this.player) {
                return game;
            }
        }

        return undefined;
    }


    deleteGame = () => {
        console.log('deleteGame');
        window.localStorage.removeItem('game');
    }


    createGame = (game) => {
        game.event = 'createGame';
        console.log('createGame', game);
        return window.localStorage.setItem('game', JSON.stringify(game));
    }

    saveGame = (game, event) => {
        game.event = event;
        console.log('saveGame', game);
        window.localStorage.setItem('game', JSON.stringify(game));
    }



    getGame = () => {
        let gameJson = window.localStorage.getItem('game');
        if (gameJson && gameJson !== null) {
            return JSON.parse(gameJson);
        }
        return undefined
    }



    getIdentity = () => (this.player);


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


    addJoinListener(cb) {
        console.log('addJoinListener');
        this.on('JoinGame', cb);
    }


    removeJoinListener(cb) {
        console.log('removeJoinListener');
        this.off('JoinGame', cb)
    }


    addAliceSignListener(cb) {
        console.log('addAliceSignListener');
        this.on('AliceSign', cb);
    }

    removeAliceSignListener(cb) {
        console.log('removeAliceSignListener');
        this.off('AliceSign', cb)
    }


    addDeployedListener(cb) {
        console.log('addDeployedListener');
        this.on('deployed', cb);
    }


    removeDeployedListener(cb) {
        console.log('removeDeployedListener');
        this.off('deployed', cb)
    }


    addNextListener(cb) {
        console.log('addNextListener');
        this.on('next', cb);
    }

    removeNextListener(cb) {
        console.log('removeNextListener');
        this.off('next', cb)
    }
}

const server = new Server();

export default server;
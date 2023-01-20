const fs = require('fs');
const path = require('path');
const {
    
    compileContract
} = require('scryptlib');


function setup(){

    const scryptfile = path.join(__dirname, 'out', 'src', 'contracts', 'tictactoe.scrypt');
    compileContract(scryptfile, {
        out: path.join(__dirname, 'out', 'src', 'contracts'),
        artifact: true
    });

    ['tictactoe.json', 'tictactoe.transformer.json'].forEach(filename => {

        const src = path.join(__dirname, 'out', 'src', 'contracts', filename);
        const dest = path.join(__dirname, 'public', filename);
        fs.copyFileSync(src, dest)
    })
    console.log('setup successfully.')
}

setup()



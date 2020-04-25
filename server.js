const crypto = require('crypto');
const Swarm = require('discovery-swarm');
const defaults = require('dat-swarm-defaults');
const getPort = require('get-port');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
    terminal: false,
});

const peers = {};
let connSeq = 0;

const myId = crypto.randomBytes(32);
console.log('Your identity: ' + myId.toString('hex'));

function log() {
    for (let i = 0, len = arguments.length; i < len; i++) {
        console.log(arguments[i])
    }
}

const askUser = async () => {
    rl.prompt();
    rl.on('line', (input) => {
        if (input.length > 1) {
            for (let id in peers) {
                peers[id].conn.write(input)
            }
        } else {
            rl.prompt();
        }
    });
};

const config = defaults({
    id: myId,
});

const sw = Swarm(config)
;(async () => {

    const port = await getPort();

    sw.listen(port);
    console.log('Listening to port: ' + port);

    sw.join('P2P-Swarm'); // change it
    askUser();

    sw.on('connection', (conn, info) => {
        const seq = connSeq;
        const peerId = info.id.toString('hex');
        log(`Connected #${seq} to peer: ${peerId}`);

        if (info.initiator) {
            try {
                conn.setKeepAlive(true, 600)
            } catch (exception) {
                log('exception', exception)
            }
        }
        conn.on('data', data => {
            log(
                'Received Message from peer ' + peerId,
                '--> ' + data.toString()
            )
        });
        conn.on('close', () => {
            log(`Connection ${seq} closed, peer id: ${peerId}`);
            if (peers[peerId].seq === seq) {
                delete peers[peerId]
            }
        });
        if (!peers[peerId]) {
            peers[peerId] = {}
        }
        peers[peerId].conn = conn;
        peers[peerId].seq = seq;
        connSeq++

    });

})();


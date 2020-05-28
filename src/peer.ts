import {State, Datum, Comparable, JSONType} from "./state";
import {Peer} from "simple-peer";

export class StateOverSimplePeer extends State {
    _peers: Array<Peer>;

    constructor(userID: Comparable) {
        super(userID);
        this._peers = [];
    }

    // Sends a network message to a given peer (or all peers if omitted)
    _sendMessage(message: JSONType, peer?: Peer) {
        let recipients = this._peers;
        if (peer !== undefined) {
            recipients = [peer];
        }
        recipients.forEach(p => {
            p.send(message);
        });
        console.log("Model is:", this._model);
        console.log("TX:", message);
    }

    // Requests that a peer (or all peers) send their complete state
    _requestCompleteState(peer?: Peer) {
        this._sendMessage({
            "action": "sendCompleteState",
        }, peer);
    }

    // Called when a message comes in over the peer
    _receivedMessage(message: JSONType) {
        if (message.action == "sendCompleteState") {
            this.emitCompleteState();
        } else if(message.action == "update") {
            this.apply(message.data);
        }
        console.log("RX:", message);
        console.log("Model is now:", this._model);
    }

    // Adds new data channel to keep in sync
    addPeer(peer: Peer) {
        if (this._peers.indexOf(peer) < 0) {
            // Set up new connection
            peer.on("data", this._receivedMessage.bind(this));

            this._peers.push(peer); // Add peer
            this._requestCompleteState(peer); // Request that the peer send its complete state
        }
    }

    // Removes a data channel
    removePeer(peer: Peer) {
        const ix = this._peers.indexOf(peer);
        if (ix >= 0) {
            this._peers.splice(ix, 1);
        }
    }

    // Send messages to peers
    _emit(data: Array<Datum>) {
        this._sendMessage({
            "action": "update",
            "data": data,
        });
    }
}

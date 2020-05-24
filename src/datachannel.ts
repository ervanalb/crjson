import {State, Datum, Comparable, JSONType} from "./state";

export class StateOverDataChannel extends State {
    _peers: Array<RTCDataChannel>;

    constructor(userID: Comparable) {
        super(userID);
        this._peers = [];
    }

    // Sends a network message to a given peer (or all peers if omitted)
    _sendMessage(message: JSONType, peer?: RTCDataChannel) {
        const msg = JSON.stringify(message);
        let recipients = this._peers;
        if (peer !== undefined) {
            recipients = [peer];
        }
        recipients.forEach(channel => {
            channel.send(msg);
        });
    }

    // Requests that a peer (or all peers) send their complete state
    _requestCompleteState(peer?: RTCDataChannel) {
        this._sendMessage({
            "action": "sendCompleteState",
        }, peer);
    }

    // Called when a message comes in over the DataChannel
    _receivedMessage(event) {
        console.log("RX:", event.data);
    }

    // Adds new data channel to keep in sync
    addPeer(peer: RTCDataChannel) {
        if (this._peers.indexOf(peer) < 0) {
            // Set up new connection
            peer.onmessage = this._receivedMessage.bind(this);

            this._peers.push(peer); // Add peer
            this._requestCompleteState(peer); // Request that the peer send its complete state
        }
    }

    // Removes a data channel
    removePeer(peer: RTCDataChannel) {
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

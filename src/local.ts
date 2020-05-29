import {State, Datum, Comparable, UniqueID} from "./state";

// This class is not particuarly useful, but shows the simplest way that State can be extended.

export class LocalState extends State {
    _peers: Array<LocalState>;

    constructor(userID: Comparable) {
        super(userID);
        this._peers = [];
    }

    // Adds connection to a new local State object to keep in sync
    addPeer(peer: LocalState) {
        if (this._peers.indexOf(peer) < 0) {
            this._peers.push(peer); // Add peer
            peer.addPeer(this); // Make sure peer adds us
            peer.emitCompleteState(); // Request that the peer send its complete state
        }
    }

    // Removes connection to a local State object
    removePeer(peer: LocalState) {
        const ix = this._peers.indexOf(peer);
        if (ix >= 0) {
            this._peers.splice(ix, 1);
            peer.removePeer(this); // Make sure peer removes us too
        }
    }

    // Override emit function to pass data to peers
    _emit(data: Array<Datum>, tombstones: Array<UniqueID>) {
        this._peers.forEach(peer => {
            peer.apply(data, tombstones);
        });
    }
}

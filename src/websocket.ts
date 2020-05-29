import {State, Datum, Comparable, JSONType, UniqueID} from "./state";

export class StateOverWebSocket extends State {
    _ws: WebSocket;
    _listenerFunction: (MessageEvent) => void;

    // Sends a network message
    _sendMessage(message: JSONType) {
        if (this._ws !== undefined) {
            this._ws.send(JSON.stringify(message));
            console.log("Model is:", this._model);
            console.log("TX:", message);
        }
    }

    // Requests that someone send their complete state
    _requestCompleteState() {
        this._sendMessage({
            "action": "sendCompleteState",
        });
    }

    // Called when a message comes in
    _receivedMessage(event: MessageEvent) {
        const message = JSON.parse(event.data);
        if (message.action === undefined) {
            return;
        }
        if (message.action == "sendCompleteState") {
            this.emitCompleteState();
        } else if(message.action == "update") {
            this.apply(message.data, message.tombstones);
            console.log("RX:", message);
            console.log("Model is now:", this._model);
        }
    }

    // Call this with an open websocket to start listening for messages on it.
    attachWebsocket(ws: WebSocket) {
        if (this._ws === ws) {
            return;
        }

        if (this._ws !== undefined) {
            this.detachWebSocket();
        }

        this._listenerFunction = this._receivedMessage.bind(this);
        ws.addEventListener("message", this._listenerFunction);
        this._ws = ws;
        this._requestCompleteState();
        this.emitCompleteState();
    }

    // Stop listening on the websocket
    detachWebSocket() {
        if (this._ws === undefined) {
            return;
        }
        this._ws.removeEventListener("message", this._listenerFunction);
        this._ws = undefined;
    }

    // Send messages
    _emit(data: Array<Datum>, tombstones: Array<UniqueID>) {
        this._sendMessage({
            "action": "update",
            "data": data,
            "tombstones": tombstones,
        });
    }
}

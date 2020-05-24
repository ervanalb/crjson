import {jsonEqual} from "./state";
import {LocalState} from "./local";

const s1 = new LocalState("user1");
const s2 = new LocalState("user2");
s1.addPeer(s2);

let state = s1.state();
s1.setState(state.model, "first post!");
console.log(s1.state().json)

state = s2.state();
s2.setState(state.model, ["first", "last"]);
console.log(s2.state().json)

// Make a simultaneous change
const state1 = s1.state();
const state2 = s2.state();
s1.setState(state1.model, ["first", "middle1", "last"]);
s2.setState(state2.model, ["first", "middle2", "last"]);

const j1 = s1.state().json;
const j2 = s2.state().json;
if (!jsonEqual(j1, j2)) {
    throw "Did not converge!";
}

// Three options:
// ["first", "middle1", "middle2", "last"]
// ["first", "middle2", "middle1", "last"]
// ["first", "middle2", "last"] (chance of index collision, resolved towards higher UID)
console.log(j1)

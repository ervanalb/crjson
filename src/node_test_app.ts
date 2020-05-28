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
let state1 = s1.state();
let state2 = s2.state();
s1.setState(state1.model, ["first", "middle1", "last"]);
s2.setState(state2.model, ["first", "middle2", "last"]);

let j1 = s1.state().json;
let j2 = s2.state().json;
if (!jsonEqual(j1, j2)) {
    throw "Did not converge!";
}
console.log(j1);

// Three options:
// ["first", "middle1", "middle2", "last"]
// ["first", "middle2", "middle1", "last"]
// ["first", "middle2", "last"] (chance of index collision, resolved towards higher UID)

state = s1.state();
s1.setState(state.model, ["first"]);
console.log(s1.state().json);

state = s1.state();
s1.setState(state.model, [1, 2, 3]);
console.log(s1.state().json);

state = s2.state();
state1 = s1.state();
state2 = s2.state();
s2.setState(state.model, [2, 3]);
console.log(s2.state().json);

s1.setState(state1.model, [2, [3]]);
s2.setState(state2.model, [[2], 3]);

console.log(s1.state().json);
console.log(s2.state().json);

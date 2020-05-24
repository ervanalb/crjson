import {State} from "./lib"

const s = new State("user1");

let state = s.state();
s.setState(state.model, "first post!");
console.log(s.state().json)

state = s.state();
s.setState(state.model, ["first", "middle", "last"]);
console.log(s.state().json)

state = s.state();
s.setState(state.model, ["first", {"pos": "middle"}, "last"]);
console.log(s.state().json)

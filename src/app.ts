import {State, Datum, JSONType} from "./lib";

const s = new State("user1");
s.addListener((model: Array<Datum>, json: JSONType) => {
    console.log("Model changed!", model.length);
});

let state = s.state();
s.setState(state.model, "first post!");
console.log(s.state().json)

state = s.state();
s.setState(state.model, ["first", "middle", "last"]);
console.log(s.state().json)

state = s.state();
s.setState(state.model, ["first", {"pos": "middle"}, "last"]);
console.log(s.state().json)

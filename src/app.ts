import {State} from "./lib"

const s = new State("user1");

s.apply({
    uid: s.getUID(),
    value: "first post",
    counter: 0,
});

const dictUID = s.getUID();
s.apply({
    uid: dictUID,
    value: {},
    counter: 1,
});

s.apply({
    uid: s.getUID(),
    parent: dictUID,
    index: "a",
    value: "b",
    counter: 0,
});

s.apply({
    uid: s.getUID(),
    parent: dictUID,
    index: "c",
    value: "d",
    counter: 0,
});

const arrUID = s.getUID();
s.apply({
    uid: arrUID,
    parent: dictUID,
    index: "e",
    value: [],
    counter: 0,
});

s.apply({
        uid: s.getUID(),
        parent: arrUID,
        index: [1],
        value: "first",
        counter: 0,
});

s.apply({
        uid: s.getUID(),
        parent: arrUID,
        index: [2],
        value: "last",
        counter: 0,
});

s.apply({
        uid: s.getUID(),
        parent: arrUID,
        index: [1, 5],
        value: "middle",
        counter: 0,
});

s.apply({
        uid: s.getUID(),
        parent: dictUID,
        index: "c",
        counter: 1,
});

const state = s.state();
state.json = ["first", {"pos": "middle"}, "last"];
s.setState(state.model, state.json);
console.log(s.state().json)

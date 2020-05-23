import {State, modelToJSON} from "./lib"

const s = new State("user1");

s.model = {data: [
    {
        uid: {userId: "user1", opId: 0},
        parent: null,
        value: "first post",
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 1},
        parent: null,
        value: {},
        counter: 1,
    },
    {
        uid: {userId: "user1", opId: 2},
        parent: {userId: "user1", opId: 1},
        index: "a",
        value: "b",
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 3},
        parent: {userId: "user1", opId: 1},
        index: "c",
        value: "d",
        counter: 0,
    }
]};

console.log(modelToJSON(s.model));

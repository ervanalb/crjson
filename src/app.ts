import {State, modelToJSON} from "./lib"

const s = new State("user1");

s.model = {data: [
    {
        uid: {userId: "user1", opId: 0},
        value: "first post",
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 1},
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
    },
    {
        uid: {userId: "user1", opId: 4},
        parent: {userId: "user1", opId: 1},
        index: "e",
        value: [],
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 5},
        parent: {userId: "user1", opId: 4},
        index: [0],
        value: "first",
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 6},
        parent: {userId: "user1", opId: 4},
        index: [1],
        value: "last",
        counter: 0,
    },
    {
        uid: {userId: "user1", opId: 7},
        parent: {userId: "user1", opId: 4},
        index: [0, 5],
        value: "middle",
        counter: 0,
    },
]};

console.log(modelToJSON(s.model));

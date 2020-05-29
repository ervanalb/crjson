import {jsonEqual, jsonCopy, betterTypeOf, arrayMap, objectMap, JSONType} from "./state";
import {LocalState} from "./local";

function randomString(): string {
    const strLen = 4;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const arr = new Array(strLen).fill(0);
    return arr.map(() => alphabet.substr(Math.floor(Math.random() * alphabet.length), 1)).join("");
}

function randomJSON(initialAlpha: number): JSONType {
    const alphaGain = 0.5;
    const maxArrLen = 6;
    const maxObjLen = 6;

    function randomJSONPrimitive(): JSONType {
        const a = Math.random();
        if (a < 0.25) {
            return Math.floor(Math.random() * 100);
        }
        if (a < 0.5) {
            return randomString();
        }
        if (a < 0.75) {
            return Math.random() < 0.5;
        }
        return null;
    }

    function randomJSONArray(alpha: number): JSONType {
        const length = Math.floor(Math.random() * maxArrLen);
        const arr = new Array(length).fill(0);
        return arr.map(() => randomJSONValue(alpha * alphaGain));
    }

    function randomJSONObject(alpha: number): JSONType {
        const length = Math.floor(Math.random() * maxObjLen);
        const obj = {};
        for (let i = 0; i < length; i++) {
            obj[randomString()] = randomJSONValue(alpha * alphaGain);
        }
        return obj;
    }

    function randomJSONValue(alpha: number): JSONType {
        const a = Math.random();
        if (a < alpha * 0.5) {
            return randomJSONArray(alpha);
        }
        if (a < alpha) {
            return randomJSONObject(alpha);
        }
        return randomJSONPrimitive();
    }

    return randomJSONValue(initialAlpha);
}

function variationOn(json: JSONType, p: number) {
    const alpha = 0.6;

    function variationOnArray(value: JSONType) {
        const result = arrayMap(value, item => {
            if (Math.random() < p) {
                return undefined;
            }
            if (Math.random() < p) {
                return variationOnValue(item);
            }
            return item;
        });
        while (Math.random() < p) {
            result.splice(Math.floor(Math.random() * result.length), 0, randomJSON(alpha));
        }
        return result;
    }

    function variationOnObject(value: JSONType) {
        const result = objectMap(value, item => {
            if (Math.random() < p) {
                return undefined;
            }
            if (Math.random() < p) {
                return variationOnValue(item);
            }
            return item;
        });
        while (Math.random() < p) {
            result[randomString()] = randomJSON(alpha);
        }
        return result;
    }

    function variationOnValue(value: JSONType) {
        if (Math.random() < p) {
            return randomJSON(alpha);
        }

        if (betterTypeOf(value) == "array") {
            return variationOnArray(value);
        }
        if (betterTypeOf(value) == "object") {
            return variationOnArray(value);
        }
        return randomJSON(alpha)
    }

    return variationOnValue(jsonCopy(json));
}

function assertJSONEqual(a: any, b: any, extra: object) {
    if (!jsonEqual(a, b)) {
        console.assert(false, "JSON not equal!");
        console.log("got = ", a);
        console.log("wanted = ", b);
        for (let item in extra) {
            console.log(item, "=", extra[item]);
        }
        process.exit(1);
    }
}

let user1;

function mutate(inputJSON: JSONType) {
    const s = user1.state();
    user1.setState(s.model, inputJSON);
    assertJSONEqual(user1.state().json, inputJSON, {"prev json": s.json, "prev model": s.model, "cur model": user1.state().model});
}

// Very basic fuzz to test inserting into an empty list
console.log("Test simple operations...");
for (let i = 0; i < 100; i++) {
    user1 = new LocalState("user1");

    mutate([]);
    mutate(["a", "b", "c"]);
    mutate(["a"]);
    mutate([1, null, 2]);

    mutate([6, 7]);
    mutate([5, 6, "a"]);

    mutate([ "c", 1 ]);
    mutate([ "c", 2, 1]);
}

// Fuzz with single client
console.log("Fuzz single client...");
for (let i = 0; i < 20; i++) {
    user1 = new LocalState("user1");
    mutate(randomJSON(1.5));
    for (let j = 0; j < 20; j++) {
        mutate(variationOn(user1.state().json, 0.05));
    }
}

// Fuzz with multiple client
function initialize(user: LocalState, inputJSON: JSONType) {
    const s = user.state();
    user.setState(s.model, inputJSON);
    assertJSONEqual(user.state().json, inputJSON, {"prev json": s.json, "prev model": s.model, "cur model": user.state().model});
}

console.log("Fuzz multiple client...");
const n_users = 10;
for (let i = 0; i < 20; i++) {
    const userVector = Array.from(new Array(n_users).keys()).map((ui) => new LocalState(`user${ui}`));

    userVector.forEach((userA) => {
        userVector.forEach((userB) => {
            userA.addPeer(userB);
        });
    });

    const startingJSON = randomJSON(1.5);
    userVector.forEach((u) => initialize(u, startingJSON));
    for (let j = 0; j < 20; j++) {
        const stateVector = userVector.map((user) => user.state());
        stateVector.forEach((state, ui) => userVector[ui].setState(state.model, variationOn(state.json, 0.05)));

        // Check that all parties agree
        const correctJSON = userVector[0].state().json;
        userVector.forEach((user) => {
            assertJSONEqual(user.state().json, correctJSON, {});
        });
    }
}

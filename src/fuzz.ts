import {jsonEqual, betterTypeOf, arrayMap, objectMap, JSONType} from "./state";
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

    return variationOnValue(json);
}

function assertJSONEqual(a: any, b: any, extra: object) {
    if (!jsonEqual(a, b)) {
        console.assert(false, "JSON not equal!");
        console.log("got = ", a);
        console.log("wanted = ", b);
        for (let item in extra) {
            console.log(item, "=", extra[item]);
        }
    }
}

let user1;
let s, inputJSON, prev = {model: undefined, json: undefined};

// Very basic fuzz to test inserting into an empty list
console.log("Test inserting into empty list...");
for (let i = 0; i < 100; i++) {
    user1 = new LocalState("user1");
    s = user1.state();
    inputJSON = [];
    user1.setState(s.model, inputJSON);
    prev = user1.state();

    inputJSON = ["a", "b", "c"];
    s = user1.state();
    user1.setState(s.model, inputJSON);
    assertJSONEqual(user1.state().json, inputJSON, {"prev json": prev.json, "prev model": prev.model, "cur model": user1.state().model});
    prev = user1.state();

    inputJSON = ["a"];
    s = user1.state();
    user1.setState(s.model, inputJSON);
    assertJSONEqual(user1.state().json, inputJSON, {"prev json": prev.json, "prev model": prev.model, "cur model": user1.state().model});
    prev = user1.state();

    inputJSON = [1, null, 2];
    s = user1.state();
    user1.setState(s.model, inputJSON);
    assertJSONEqual(user1.state().json, inputJSON, {"prev json": prev.json, "prev model": prev.model, "cur model": user1.state().model});
    prev = user1.state();
}

// Fuzz with single client
console.log("Test single client...");
for (let i = 0; i < 10; i++) {
    user1 = new LocalState("user1");
    s = user1.state();
    inputJSON = randomJSON(1.5);
    user1.setState(s.model, inputJSON);
    assertJSONEqual(user1.state().json, inputJSON, {"prev json": prev.json, "prev model": prev.model, "cur model": user1.state().model});
    prev = user1.state();
    for (let j = 0; j < 10; j++) {
        s = user1.state();
        inputJSON = variationOn(s.json, 0.05);
        user1.setState(s.model, inputJSON);
        assertJSONEqual(user1.state().json, inputJSON, {"prev json": prev.json, "prev model": prev.model, "cur model": user1.state().model});
        prev = user1.state();
    }
}

// Atomic types are: numbers, strings, empty list [], empty object {}, null, true, false.
export type Atomic = number | string | object | null | boolean;

// Any hashable type can be used as a userID. All atomic items must be hashable, such as strings and numbers.
export type Comparable = Atomic;

export type JSONType = any;

// A combination of a user ID + an op ID gives a unique identifier for a datum.
// userID is set on construction (and must be unique in the system) and opID increments for every operation.
export interface UniqueID {
    userID: Comparable;
    opID: number;
}

// A datum is an atomic value i.e. one whose merge function returns one of the two arguments rather than an amalgamation of them.
// If "value" is missing, then this atom represents a deletion.
export interface Datum {
    uid: UniqueID;
    parent?: UniqueID;
    value?: any;
    counter: number; // Lamport counter
    index?: Array<number> | string; // An array index is done using a vector, and an object index is a string.
}

export type Listener = (model: Array<Datum>, json: JSONType) => void;

// More practical version of typeOf for JSON
export function betterTypeOf(item: Comparable): string {
    if (item === undefined) {
        return "empty";
    }
    if (item === null) {
        return "null";
    }
    if (typeof item == "boolean") {
        return "boolean";
    }
    if (typeof item == "number") {
        return "number";
    }
    if (typeof item == "string") {
        return "string";
    }
    if (Array.isArray(item)) {
        return "array";
    }
    if (typeof item == "object") {
        return "object";
    }
    return undefined;
}

// Compares values. Returns negative if first < second, positive if first > second, and zero if they are equal.
export function compare(first: Comparable, second: Comparable): number {
    const typeOrdering = {
        "empty": -1,
        "null": 0,
        "boolean": 1,
        "number": 2,
        "string": 3,
        "array": 4,
        "object": 5,
    }
    const typeOfFirst = betterTypeOf(first);
    const typeOfSecond = betterTypeOf(second);
    if (typeOfFirst != typeOfSecond) {
        return typeOrdering[typeOfFirst] - typeOrdering[typeOfSecond];
    }

    if (typeOfFirst == "boolean" || typeOfFirst == "number") {
        return <number>first - <number>second;
    }

    if (typeOfFirst == "string") {
        if (<string>first > <string>second) {
            return 1;
        } else if (<string>first < <string>second) {
            return -1;
        }
        return 0;
    }

    return 0; // Consider all arrays equal and all objects equal
}

// Compare UIDs. Returns negative if first < second, positive if first > second, and zero if they are equal.
export function compareUIDs(first: UniqueID, second: UniqueID) {
    if (first === undefined && second === undefined) {
        return 0;
    }
    if (first === undefined && second !== undefined) {
        return -1;
    }
    if (first !== undefined && second === undefined) {
        return 1;
    }
    if (first.userID != second.userID) {
        return compare(first.userID, second.userID);
    }
    return first.opID - second.opID;
}

// Compare vector indices. Returns negative if first < second, positive if first > second, and zero if they are equal.
export function compareVectorIndices(first: Array<number>, second: Array<number>) {
    for(let i = 0; i < Math.max(first.length, second.length); i++) {
        const firstIndex = first[i];
        const secondIndex = second[i];
        if (firstIndex === undefined) {
            return -1;
        }
        if (secondIndex === undefined) {
            return 1;
        }
        if (firstIndex != secondIndex) {
            return firstIndex - secondIndex;
        }
    }
    return 0;
}

// Filters a model on a given parent
export function filterChildren(data: Array<Datum>, parent: UniqueID): Array<Datum> {
    return data.filter(item => compareUIDs(item.parent, parent) == 0);
}

// Returns the best atom candidate in a list
export function mergeAtoms(data: Array<Datum>): Datum {
    if (data.length == 0) {
        return undefined;
    }
    return data.reduce((prev, cur) => {
        if (cur.counter > prev.counter) {
            return cur;
        } else if (prev.counter > cur.counter) {
            return prev;
        }
        const uidComparison = compareUIDs(cur.uid, prev.uid);
        if (uidComparison < 0) {
            return cur;
        } else if (uidComparison > 0) {
            return prev;
        } else {
            throw "Could not find ordering between objects";
        }
    });
}

// Sorts vector indices
export function sortedVectorIndices(data: Array<Datum>): Array<Array<number>> {
    // Extract vector indices into array
    const arrayIndices = [];
    data.forEach(datum => {
        if (datum.index !== undefined && betterTypeOf(datum.index) == "array") {
            arrayIndices.push(datum.index);
        }
    });

    // Sort by vector index
    arrayIndices.sort(compareVectorIndices);

    // Remove duplicates
    const uniqueIndices = [];
    let lastVectorIndex;
    arrayIndices.forEach(vectorIndex => {
        if (lastVectorIndex === undefined || compareVectorIndices(lastVectorIndex, vectorIndex) != 0) {
            uniqueIndices.push(vectorIndex);
        }
        lastVectorIndex = vectorIndex;
    });

    return uniqueIndices;
}

// Groups a flat list of Datums by their string indices (for datums in objects)
export function groupByStringIndex(data: Array<Datum>): { [key: string]: Array<Datum>; } {
    const result = {};

    data.forEach(datum => {
        if (datum.index !== undefined && betterTypeOf(datum.index) == "string") {
            if (result[<string>datum.index] !== undefined) {
                result[<string>datum.index].push(datum);
            } else {
                result[<string>datum.index] = [datum];
            }
        }
    });

    return result;
}

// Groups a flat list of Datums by their vector indices (for datums in arrays)
export function groupByVectorIndex(data: Array<Datum>): { [key: string]: Array<Datum>; } {
    const result = {};

    data.forEach(datum => {
        if (datum.index !== undefined && betterTypeOf(datum.index) == "array") {
            const stringIndex = datum.index.toString(); // Should be safe, since the key is a list of ints
            if (result[stringIndex] !== undefined) {
                result[stringIndex].push(datum);
            } else {
                result[stringIndex] = [datum];
            }
        }
    });

    return result;
}

// Array.map, but removes undefined entries.
export function arrayMap(a: Array<any>, f: (item: any, key: any, arr: Array<any>) => any): Array<any> {
    const result = [];
    for (const index in a) {
        const value = f(a[index], index, a);
        if (value !== undefined) {
            result.push(value);
        }
    }
    return result;
}

// Array.map, but for object.
// If the function returns undefined, the value is omitted.
export function objectMap(o: object, f: (item: any, key: any, obj: object) => any): object {
    const result = {};
    for (const key in o) {
        const value = f(o[key], key, o);
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

// Converts a (partial) model into its JSON representation
export function modelToJson(model: Array<Datum>, root: Array<Datum>) {
    // Keep track of which data are actually used to construct the JSON,
    // so we can prune the others
    const usefulData = [];

    function getArray(parent: UniqueID) {
        const children = filterChildren(model, parent);
        const grouped = groupByVectorIndex(children);
        const sortedIndices = sortedVectorIndices(children);
        const arrayAsObj = objectMap(grouped, getValue);
        return arrayMap(sortedIndices, vectorIndex => arrayAsObj[vectorIndex]);
    }

    function getObject(parent: UniqueID) {
        const children = filterChildren(model, parent);
        const grouped = groupByStringIndex(children);
        return objectMap(grouped, getValue);
    }

    function getValue(data: Array<Datum>) {
        const datum = mergeAtoms(data);
        if (datum === undefined) {
            return undefined;
        }
        usefulData.push(datum);
        const typeOfValue = betterTypeOf(datum.value);
        if (typeOfValue == "array") {
            return getArray(datum.uid);
        } else if (typeOfValue == "object") {
            return getObject(datum.uid);
        } else {
            return <Datum>datum.value;
        }
    }

    if (root === undefined) {
        root = filterChildren(model, undefined); // Parent === undefined indicates root items
    }

    let rootJSON = getValue(root);
    if (rootJSON === undefined) {
        // Totally empty slate
        rootJSON = null;
    }

    return {
        json: rootJSON,
        usefulData: usefulData
    }
}

// Returns true if the two JSON objects are exactly equal.
export function jsonEqual(first: JSONType, second: JSONType): boolean {
    return JSON.stringify(first) == JSON.stringify(second);
}

// Returns a deep copy of a JSON object
export function jsonCopy(json: JSONType): JSONType {
    return JSON.parse(JSON.stringify(json));
}

// Allocates a new vector index that falls between the two given vector indices.
export function vectorIndexBetween(left: Array<number>, right: Array<number>) {
    // Uses the algorithm described in this paper, but with only the boundary+ strategy right now.
    // Brice Nédelec, Pascal Molli, Achour Mostefaoui, Emmanuel Desmontils. LSEQ: an Adaptive Structure
    // for Sequences in Distributed Collaborative Editing. 13th ACM Symposium on Document Engineering
    // (DocEng), Sep 2013, Florence, Italy. pp.37–46, ff10.1145/2494266.2494278ff. ffhal-00921633f

    function allocateBetween(left: Array<number>, right: Array<number>, level: number) {
        let leftNum = 0;
        let rightNum = Math.pow(2, level + 4);
        if (left !== undefined && left[level] !== undefined) {
            leftNum = Math.max(leftNum, left[level]);
        }
        if (right !== undefined && right[level] !== undefined) {
            rightNum = Math.min(rightNum, right[level]);
        }

        if (leftNum + 1 > rightNum) {
            throw `Invalid interval: (${left}, ${right})`;
        }

        // We can allocate a new number on the open interval (leftNum, rightNum)
        if (leftNum + 1 == rightNum) {
            return [leftNum].concat(allocateBetween(left, right, level + 1));
        }
        const lowerBound = leftNum + 1;
        const upperBound = Math.min(lowerBound + 10, rightNum);
        const newIndex = lowerBound + Math.floor(Math.random() * (upperBound - lowerBound));
        return [newIndex];
    }

    const result = allocateBetween(left, right, 0);
    return result;
}

// Creates an operations to remove an entry from the model..
// Parent & index may be undefined if this is to be a root object.
export function tombstone(uid: UniqueID, datum: Datum): Datum {
    const tombstone: Datum = {
        uid: uid,
        counter: datum.counter + 1,
    };
    if (datum.parent !== undefined) {
        tombstone.parent = datum.parent;
    }
    if (datum.index !== undefined) {
        tombstone.index = datum.index;
    }
    return tombstone;
}

export class State {
    _uid: UniqueID;
    _model: Array<Datum>;
    _json: JSONType;
    _version: Array<UniqueID>;
    _listeners: Array<Listener>;

    constructor(userID: Comparable) {
        this._uid = {
            userID: userID,
            opID: 0,
        }
        this._model = [];
        this._json = null;
        this._listeners = [];
    }

    // Retrieves a new UID for constructing an operation.
    getUID(): UniqueID {
        const result = {
            userID: this._uid.userID,
            opID: this._uid.opID,
        };
        this._uid.opID++;
        return result;
    }

    // Apply an array of actions.
    // For local changes, set emit=true to also issue an _emit call.
    // For remote changes, set emit=false to avoid flooding the channel.
    // Also converts a Model into its JSON representation
    // and, in doing so, prunes non-useful entries in the model.
    apply(actions: Array<Datum>, emit: boolean) {
        if (actions.length == 0) {
            return;
        }

        this._model.push(...actions);
        const result = modelToJson(this._model, undefined); // undefined parent indicates root object
        this._json = result.json;

        // Prune useless data
        this._model = this._model.filter(item => result.usefulData.indexOf(item) >= 0);
        // TODO we can further prune deletion actions according to the version vector.

        if (emit) {
            this._emit(actions);
        }

        this._changed(this._model, this._json);
    }

    // Emits the complete state
    emitCompleteState() {
        if (this._model.length == 0) {
            return;
        }
        this._emit(this._model);
    }

    // Gets the current state (internal & JSON)
    // The resulting JSON is a deep copy that can be modified.
    state() {
        return {
            model: jsonCopy(this._model),
            json: jsonCopy(this._json),
        };
    }

    // Sets the current state based on an old model and new JSON
    setState(model: Array<Datum>, json: JSONType) {
        const diff = this._jsonDiff(model, json);
        this.apply(diff, true);
    }

    // Adds a new listener callback function, which will be called when the model changes
    addListener(listener: Listener) {
        this._listeners.push(listener);
    }

    // Removes a listener
    removeListener(listener: Listener) {
        const ix = this._listeners.indexOf(listener);
        if (ix >= 0) {
            this._listeners.splice(ix, 1);
        }
    }

    // Calls all listeners
    _changed(model: Array<Datum>, json: JSONType) {
        this._listeners.forEach(listener => {
            listener(model, json);
        });
    }

    // Override this method to send out state changes over a channel
    _emit(model: Array<Datum>) {
        // Not implemented
    }

    // Diffs a JSON object with the given model, returning a list of new items to add to the model.
    _jsonDiff(model: Array<Datum>, json: JSONType): Array<Datum> {

        const newOps: Array<Datum> = [];

        const checkArray = (parent: UniqueID, json: Array<JSONType>) => {
            interface DiffOperation {
                cost: number;
                prev?: [number, number];
                operation?: string;
                oldIndex?: number;
                newIndex?: number;
            };

            const children = filterChildren(model, parent);
            const grouped = groupByVectorIndex(children);
            const sortedIndices = sortedVectorIndices(children);
            const jsonArrayAsObj = objectMap(grouped, data => modelToJson(model, data).json);
            const modelJSON = arrayMap(sortedIndices, vectorIndex => jsonArrayAsObj[vectorIndex]);
            const modelData = arrayMap(sortedIndices, vectorIndex => grouped[vectorIndex]);

            // We now have two JSON arrays, "modelJSON" and "json".

            // Perform Wagner-Fisher algorithm on them
            // (algorithm from pseudocode on wikipedia)
            const matrix: { [key: string]: DiffOperation; } = {};
            matrix[[0, 0].toString()] = {cost: 0};
            for (let i = 1; i <= modelJSON.length; i++) {
                matrix[[i, 0].toString()] = {
                    cost: i,
                    prev: [i - 1, 0],
                    operation: "delete",
                    oldIndex: i - 1,
                    newIndex: -1,
                }
            }
            for (let j = 1; j <= json.length; j++) {
                matrix[[0, j].toString()] = {
                    cost: j,
                    prev: [0, j - 1],
                    operation: "insert",
                    oldIndex: -1, // insert at beginning
                    newIndex: j - 1,
                };
            }
            for (let i = 1; i <= modelJSON.length; i++) {
                for (let j = 1; j <= json.length; j++) {
                    let substitutionCost = 1;
                    if (jsonEqual(modelJSON[i - 1], json[j - 1])) {
                        substitutionCost = 0;
                    }

                    const deletion: DiffOperation = {
                        cost: matrix[[i - 1, j].toString()].cost + 1,
                        prev: [i - 1, j],
                        operation: "delete",
                    };
                    const insertion: DiffOperation = {
                        cost: matrix[[i, j - 1].toString()].cost + 1,
                        prev: [i, j - 1],
                        operation: "insert",
                    };
                    const substitution: DiffOperation = {
                        cost: matrix[[i - 1, j - 1].toString()].cost + substitutionCost,
                        prev: [i - 1, j - 1],
                    }
                    if (substitutionCost > 0) {
                        substitution.operation = "substitute";
                    }

                    let lowestCostOp = substitution;
                    if (insertion.cost < lowestCostOp.cost) {
                        lowestCostOp = insertion;
                    }
                    if (deletion.cost < lowestCostOp.cost) {
                        lowestCostOp = deletion;
                    }

                    lowestCostOp.oldIndex = i - 1;
                    lowestCostOp.newIndex = j - 1;

                    matrix[[i, j].toString()] = lowestCostOp;
                }
            };

            let o = matrix[[modelJSON.length, json.length].toString()];

            const ops = [];
            while (o.cost > 0) {
                if (o.operation !== undefined) {
                    ops[o.cost - 1] = o;
                }
                o = matrix[o.prev.toString()];
            }

            // Apply the operations, recursing as needed
            ops.forEach(op => {
                if (op.operation == "insert") {
                    let leftIndex = undefined;
                    if (op.oldIndex >= 0) {
                        leftIndex = sortedIndices[op.oldIndex];
                    }
                    let rightIndex = undefined;
                    if (op.oldIndex + 1 < sortedIndices.length) {
                        rightIndex = sortedIndices[op.oldIndex + 1];
                    }
                    const newVectorIndex = vectorIndexBetween(leftIndex, rightIndex);
                    newOps.push(...this._jsonToModel(json[op.newIndex], 0, parent, newVectorIndex));
                    sortedIndices[op.oldIndex] = newVectorIndex; // So that multiple insertions appear in-order
                } else if (op.operation == "delete") {
                    newOps.push(tombstone(this.getUID(), modelData[op.oldIndex]));
                } else if (op.operation == "substitute") {
                    checkValue(parent, modelData[op.oldIndex], json[op.newIndex]);
                }
            });
        };

        const checkObject = (parent: UniqueID, json: object) => {
            const children = filterChildren(model, parent);
            const grouped = groupByStringIndex(children);

            for (const modelKey in grouped) {
                checkValue(parent, grouped[modelKey], json[modelKey]);
            }
            for (const jsonKey in json) {
                if (!(jsonKey in grouped)) {
                    newOps.push(...this._jsonToModel(json[jsonKey], 0, parent, jsonKey));
                }
            }
        };

        const checkValue = (parent: UniqueID, data: Array<Datum>, json: JSONType) => {
            const datum = mergeAtoms(data);
            if (datum === undefined) {
                // Datum is undefined if data was empty, such as a totally blank slate model
                if (json !== undefined) {
                    newOps.push(...this._jsonToModel(json, 0, parent, undefined));
                    return;
                }
            }
            if (json === undefined && datum.value !== undefined) {
                // Passing in json === undefined indicates that any value at this slot should be deleted.
                // datum.value being undefined represents a deletion action in the model, and so
                // datum.value being defined indicates that there is in fact a value to delete
                newOps.push(tombstone(this.getUID(), datum));
                return;
            }
            const typeOfModel = betterTypeOf(datum.value);
            const typeOfJson = betterTypeOf(json);
            if (typeOfModel != typeOfJson) {
                newOps.push(...this._jsonToModel(json, datum.counter + 1, parent, datum.index));
                return;
            }

            if (typeOfModel == "array") {
                return checkArray(datum.uid, json);
            } else if (typeOfModel == "object") {
                return checkObject(datum.uid, json);
            } else if (datum.value != json) {
                newOps.push(...this._jsonToModel(json, datum.counter + 1, parent, datum.index));
                return;
            }
        };

        checkValue(undefined, filterChildren(model, undefined), json); // undefined parent indicates root object

        return newOps;
    }


    // Creates the list of operations necessary to add the given JSON to a model.
    // parent & index may be undefined if this is to be a root object.
    _jsonToModel(json: JSONType, counter: number, parent: UniqueID, index: string | Array<number>): Array<Datum> {
        const data: Array<Datum> = [];

        const addArray = (json: Array<JSONType>, parent: UniqueID) => {
            let leftBound = undefined;
            json.forEach(value => {
                const index = vectorIndexBetween(leftBound, undefined);
                addValue(value, 0, parent, index);
                leftBound = index;
            });
        };

        const addObject = (json: object, parent: UniqueID) => {
            for (const key in json) {
                addValue(json[key], 0, parent, key);
            }
        };

        const addValue = (json: JSONType, counter: number, parent: UniqueID, index: string | Array<number>) => {
            const typeOfValue = betterTypeOf(json);
            let value;
            if (typeOfValue == "array") {
                value = [];
            } else if (typeOfValue == "object") {
                value = {};
            } else {
                value = json;
            }
            const datum: Datum = {
                uid: this.getUID(),
                value: value,
                counter: counter,
            };
            if (parent !== undefined) {
                datum.parent = parent;
            }
            if (index !== undefined) {
                datum.index = index;
            }
            data.push(datum);
            if (typeOfValue == "array") {
                addArray(json, datum.uid);
            } else if (typeOfValue == "object") {
                addObject(json, datum.uid);
            }
        };

        addValue(json, counter, parent, index);

        return data;
    }
}

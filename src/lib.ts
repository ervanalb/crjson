// Atomic types are: numbers, strings, empty list [], empty object {}, null, true, false.
type Atomic = number | string | object | null | boolean;

// Any hashable type can be used as a userID. All atomic items must be hashable, such as strings and numbers.
type Comparable = Atomic;

type JSONType = any;

// A combination of a user ID + an op ID gives a unique identifier for a datum.
// userID is set on construction (and must be unique in the system) and opID increments for every operation.
interface UniqueID {
    userID: Comparable;
    opID: number;
}

type Datum = Atom | (Atom & InArray) | (Atom & InObject);

// A datum is an atomic value i.e. one whose merge function returns one of the two arguments rather than an amalgamation of them.
// If "value" is missing, then this atom represents a deletion.
interface Atom {
    uid: UniqueID;
    parent?: UniqueID;
    value?: any;
    counter: number; // Lamport counter
}

// This is a mixin type to "Atom" to indicate that it is stored in an array.
interface InArray {
    index: Array<number>; // An array index is done using a vector.
}

// This is a mixin type to "Atom" to indicate that it is stored in an object.
interface InObject {
    index: string;
}

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
    data.forEach(d => {
        const datum = <Atom & InObject>d;
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

    data.forEach(d => {
        const datum = <Atom & InObject>d;
        if (datum.index !== undefined && betterTypeOf(datum.index) == "string") {
            if (result[datum.index] !== undefined) {
                result[datum.index].push(datum);
            } else {
                result[datum.index] = [datum];
            }
        }
    });

    return result;
}

// Groups a flat list of Datums by their vector indices (for datums in arrays)
export function groupByVectorIndex(data: Array<Datum>): { [key: string]: Array<Datum>; } {
    const result = {};

    data.forEach(d => {
        const datum = <Atom & InArray>d;
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

export class State {
    uid: UniqueID;
    model: Array<Datum>;
    json: JSONType;
    version: Array<UniqueID>;

    constructor(userID: Comparable) {
        this.uid = {
            userID: userID,
            opID: 0,
        }
        this.model = [];
        this.json = null;
    }

    // Retrieves a new UID for constructing an operation.
    getUID(): UniqueID {
        const result = {
            userID: this.uid.userID,
            opID: this.uid.opID,
        };
        this.uid.opID++;
        return result;
    }

    // Apply an action
    apply(action: Datum) {
        this.model.push(action);
        this.updateJSONFromModel();
    }

    // Converts a Model into its JSON representation
    // and, in doing so, prunes non-useful entries in the model.
    updateJSONFromModel() {
        const model = this.model;

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
            const typeOfValue = betterTypeOf(datum.value);
            if (typeOfValue == "array") {
                return getArray(datum.uid);
            } else if (typeOfValue == "object") {
                return getObject(datum.uid);
            } else {
                return <Datum>datum.value;
            }
        }

        const root = getValue(filterChildren(model, undefined)); // undefined parent indicates root object
        if (root === undefined) {
            // Totally empty slate
            this.json = null;
        } else {
            this.json = root;
        }
    }
}

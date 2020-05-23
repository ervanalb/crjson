// Atomic types are: numbers, strings, empty list [], empty object {}, null, true, false.
type Atomic = number | string | object | null | boolean;

// Any hashable type can be used as a userId. All atomic items must be hashable, such as strings and numbers.
type Comparable = Atomic;

type JSONType = any;

// A combination of a user ID + an op ID gives a unique identifier for a datum.
// userId is set on construction (and must be unique in the system) and opId increments for every operation.
interface UniqueID {
    userId: Comparable;
    opId: number;
}

type Datum = Atom | (Atom & InArray) | (Atom & InObject);

// A datum is an atomic value i.e. one whose merge function returns one of the two arguments rather than an amalgamation of them.
interface Atom {
    uid: UniqueID;
    parent: UniqueID | null;
    value: any;
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

// A model is the backing data structure for a State.
// The data are stored flat.
interface Model {
    data: Array<Datum>
};

// More practical version of typeOf for JSON
export function betterTypeOf(item: Comparable): string {
    if (item === null) {
        return "null";
    }
    if (typeof item == "boolean") {
        return "boolean";
    }
    if (typeof item == "number") {
        return "number";
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
        "null": 0,
        "boolean": 1,
        "number": 2,
        "array": 3,
        "object": 4,
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
export function compareUIDs(first: UniqueID | null, second: UniqueID | null) {
    if (first === null && second === null) {
        return 0;
    }
    if (first === null && second !== null) {
        return -1;
    }
    if (first !== null && second === null) {
        return 1;
    }
    if (first.userId != second.userId) {
        return compare(first.userId, second.userId);
    }
    return first.opId - second.opId;
}

// Filters a model on a given parent
export function filterChildren(data: Array<Datum>, parent: UniqueID): Array<Datum> {
    return data.filter(item => compareUIDs(item.parent, parent) == 0);
}

// Returns the best atom candidate in a list
export function mergeAtoms(data: Array<Datum>): Datum | null {
    if (data.length == 0) {
        return null;
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

// Groups a flat list of Datums by their string indices (for datums in objects)
export function groupByStringIndex(data: Array<Datum>): { [key: string]: Array<Datum>; } {
    const result = {};

    data.forEach(d => {
        const datum = <Datum & InObject>d;
        if (datum.index !== undefined && typeof datum.index == "string") {
            if (result[datum.index] !== undefined) {
                result[datum.index].push(datum);
            } else {
                result[datum.index] = [datum];
            }
        }
    });

    return result;
}

// Array.map, but for object
export function objectMap(o: object, f: (item: any, key: any, obj: object) => any): object {
    const result = {};
    for (const key in o) {
        result[key] = f(o[key], key, o);
    }
    return result;
}

// Converts a Model into its JSON representation
export function modelToJSON(model: Model): JSONType {
    function getArray(parent: UniqueID) {
        const data = filterChildren(model.data, parent);
        return [];
    }

    function getObject(parent: UniqueID) {
        const children = filterChildren(model.data, parent);
        const grouped = groupByStringIndex(children);
        return objectMap(grouped, getValue);
    }

    function getValue(data: Array<Datum>) {
        const datum = mergeAtoms(data);
        if (datum === null) {
            return null;
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

    return getValue(filterChildren(model.data, null)); // null parent indicates root object
}

export class State {
    uid: UniqueID;
    model: Model;

    constructor(userId: Comparable) {
        this.uid = {
            userId: userId,
            opId: 0,
        }
        this.model = {
            data: [],
        };
    }
}

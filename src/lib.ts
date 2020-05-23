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

// A datum is an atomic value i.e. one whose merge function returns one of the two arguments rather than an amalgamation of them.
interface Datum {
    uid: UniqueID;
    parent: UniqueID | null;
    value: any;
    counter: number; // Lamport counter
}

// This is a mixin type to "Datum" to indicate that it is stored in an array.
interface InArray {
    index: Array<number>; // An array index is done using a vector.
}

// This is a mixin type to "Datum" to indicate that it is stored in an object.
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
export function compareUIDs(first: UniqueID, second: UniqueID) {
    if (first.userId != second.userId) {
        return compare(first.userId, second.userId);
    }
    return first.opId - second.opId;
}

// Filters a model on a given parent
export function filterData(data: Array<Datum>, parent: UniqueID): Array<Datum> {
    return data.filter(item => item.parent == parent);
}

// Returns the best atom candidate in a list
export function mergeAtoms(data: Array<Datum>): Datum {
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
    }).value;
}

// Converts a Model into its JSON representation
export function modelToJSON(model: Model): JSONType {
    const root = mergeAtoms(filterData(model.data, rootParentUID));
    return root;
}

// The UID of the parent of the root element
const rootParentUID = {
    userId: null,
    opId: 0,
};

export class State {
    uid: UniqueID;
    model: Model;

    constructor(userId: Comparable) {
        if (userId === null) {
            throw "userId cannot be null";
        }
        this.uid = {
            userId: userId,
            opId: 0,
        }
        this.model = {
            data: [],
        };
    }
}

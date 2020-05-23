import {State, modelToJSON} from "./lib"

const s = new State("user1");
console.log(modelToJSON(s.model));

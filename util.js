'use strict';

function noOp() { }

function assert(claim) {
    if (!claim) {
        throw new Error("Liar");
    }
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
const override =
    (Object.assign ? Object.assign : (obj1, obj2) => {
        for (let k in obj2) {   // (can't use const yet in Firefox)
            if (({}).hasOwnProperty.call(obj2, k)) {
                obj1[k] = obj2[k];
            }
        }
        return obj1;
    });


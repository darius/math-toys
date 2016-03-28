;(function(exports) {

'use strict';

const cnum = mathtoys.complex;

function makeConstant(z) {
    return {v: z, d: cnum.zero};
}

function makeVariable(z) {
    return {v: z, d: cnum.one};
}

const zero = makeConstant(cnum.zero);
const one  = makeConstant(cnum.one);

function add(a, b) {
    return {v: cnum.add(a.v, b.v),
            d: cnum.add(a.d, b.d)};
}

function mul(a, b) {
    return {v: cnum.mul(a.v, b.v),
            d: cnum.add(cnum.mul(a.d, b.v),
                        cnum.mul(a.v, b.d))};
}

function show(a) {
    return `[value: ${cnum.show(a.v)}; deriv: ${cnum.show(a.d)}]`;
}

if (exports.mathtoys === void 0) exports.mathtoys = {};
exports.mathtoys.autodiff = {
    makeConstant,
    makeVariable,
    zero,
    one,
    add,
    mul,
    show,
};
})(this);

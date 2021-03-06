;(function(exports) {

'use strict';

const cnum = mathtoys.complex;

// Given f: complex -> autodiff.
// Return a value z near a z1 where f(z1)'s value part would be
// cnum.zero if we were using infinite-precision numbers. (For some
// inputs the current implementation will fail, throwing an error,
// even though z1 would exist.) Use Newton's method with value as the
// starting guess for z.
// arrows is a hack for plotting the first few steps.
function findRoot(f, value, arrows) {
    for (let step = 0; step < 20; ++step) {
        const fv = f(value);
        if (cnum.eq(fv.d, cnum.zero)) {
            // Zero derivative: we succeeded or we're stuck.
            if (cnum.approxEqual(fv.v, cnum.zero)) return value;
            throw new Error("Newton got stuck at a zero derivative")
        }
//        console.log("diff", mathtoys.autodiff.show(fv));
        const z = cnum.sub(value, cnum.div(fv.v, fv.d));
        if (cnum.approxEqual(value, z)) return z;
        value = z;
        if (arrows && step < arrows.length) {
            arrows[step].at = z;
        }
    }
    throw new Error("Newton didn't converge")
}


if (exports.mathtoys === void 0) exports.mathtoys = {};
exports.mathtoys.newton = {
    findRoot,
};
})(this);

// Solving linear equality constraints

'use strict';

// const cnum = mathtoys.complex;

// Return an object mapping variable to solution, for those
// variables that eqns constrains to a value.
function solveEquations(eqns) {
    const reduced = reduceEquations(eqns);
    if (!reduced.isConsistent) {
        return {};
    } else {
        const result = {};
        reduced.equations.forEach(eqn => {
            const v = eqn.definesVar();
            if (v !== null) {
//                result[v] = cnum.neg(eqn.constant);
                result[v] = -eqn.constant;
            }
        });
        return result;
    }
}

// Try to reduce eqns to an equivalent system with each variable
// defined by a single equation. (The result may be inconsistent 
// or underconstrained.)
function reduceEquations(eqns) {
    for (let i = 0; i < eqns.length; ++i) {
        const eqi = eqns[i];
        const v = eqi.aVariable();
        if (v === null) continue;
        for (let j = 0; j < i; ++j) {
            eqns[j] = eqns[j].substituteFor(v, eqi);
            if (eqns[j].isInconsistent()) {
                return {isConsistent: false};
            }
        }
    };
    return {isConsistent: true,
            equations: (eqns.filter(eqn => !eqn.isTautology())
                            .map(eqn => eqn.normalize()))};
}

// constant: a number
// terms: an array of [variable, coefficient] pairs (all variables distinct).
// Represents: constant + sum{i}: var_i*coeff_i
function makeLinearExpr(constant, terms) {
    // Invariant: all variables distinct.
    // Invariant: no term with a 0 coefficient.

    terms = terms.filter(pair => pair[1] !== 0);

    function show() {
        let sum = '' + constant;
        for (let term of terms) {
            sum += ` + ${term[1]} ${term[0]}`;
        }
        return sum;
    }

    function getVariables() {
        return terms.map(pair => pair[0]);
    }

    function coefficient(v) {
        for (let term of terms)
            if (term[0] === v)
                return term[1];
        return 0;               // XXX zero for complex
    }

    // Return an equivalent equation with var eliminated by
    // resolving against eq (which must have a term for var).
    function substituteFor(v, expr) {
//        let c = rmul(-1, div(coefficient(v), expr.coefficient(v))
        const c = -coefficient(v) / expr.coefficient(v);
        return combine(1, expr, c);
    }

    function combine(c, e2, c2) {
        const vars = new Set(getVariables());
        e2.getVariables().forEach(v2 => vars.add(v2));
        const combination = [];
        for (let v of vars.values()) {
            combination.push([v, (c * coefficient(v) // XXX or with complex arith
                                  + c2 * e2.coefficient(v))]);
        }
        return makeLinearExpr(c * constant + c2 * e2.constant,
                              combination);
    }
    
    // Return an equivalent equation with a variable's coefficient
    // rescaled to 1.
    function normalize() {
        return scale(1 / coefficient(aVariable()));
    }

    // Return me multiplied by c.
    function scale(c) {
        return combine(c, zeroExpr, 0);
    }

    function isConstant() {
        return terms.length === 0;
    }

    function aVariable() {
        if (terms.length === 0) return null;
        return terms[0][0];
    };

    return {
        show: show,
        constant: constant,
        _terms: terms,
        getVariables: getVariables,
        coefficient: coefficient,
        aVariable: aVariable,
        isInconsistent: () => isConstant() && constant !== 0, // XXX zero for complex
        isTautology:    () => isConstant() && constant === 0,
        definesVar: () => {
            if (terms.length === 1 && terms[0][1] === 1) return terms[0][0];
            return null;
        },
        substituteFor: substituteFor,
        normalize: normalize,
        combine: combine,
    };               
}

const zeroExpr = makeLinearExpr(0, []);

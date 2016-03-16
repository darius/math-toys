// Solving linear equality constraints.

// I decided to do this over complex numbers. Another approach would
// be to solve constraints over real numbers, and translate from and
// to complex numbers in the client. Probably that'd be somewhat more
// efficient and somewhat more trouble to code up, and I'm choosing 
// to care the most about the latter.

'use strict';

const cnum = mathtoys.complex;

function showSolution(solution) {
    let result = '';
    for (let v in solution) {
        if (result !== '') result += '; ';
        result += `${v} = ${cnum.show(solution[v])}`;
    }
    return result;
}

// Return an object mapping variable to solution, for those
// variables that eqns constrains to a value.
// XXX should return a Map now
function solveEquations(eqns) {
    const reduced = reduceEquations(eqns);
    if (!reduced.isConsistent) {
        return {};
    } else {
        const result = {};
        reduced.equations.forEach(eqn => {
            const v = eqn.definesVar();
            if (v !== null) {
                result[v] = cnum.neg(eqn.constant);
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

// constant: a complex number
// terms: an array of [variable, coefficient] pairs (all variables distinct).
// Represents: constant + sum{i}: var_i*coeff_i
function makeLinearExpr(constant, terms) {
    // Invariant: all variables distinct.
    // Invariant: no term with a 0 coefficient.

    terms = terms.filter(pair => !cnum.eq(pair[1], cnum.zero));

    function show() {
        let sum = cnum.show(constant);
        for (let term of terms) {
            sum += ` + ${cnum.show(term[1])} ${term[0]}`;
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
        return cnum.zero;
    }

    // Return an equivalent equation with var eliminated by
    // resolving against eq (which must have a term for var).
    function substituteFor(v, expr) {
        const c = cnum.neg(cnum.div(coefficient(v), expr.coefficient(v)))
        return combine(cnum.one, expr, c);
    }

    function combine(c, e2, c2) {
        const vars = new Set(getVariables());
        e2.getVariables().forEach(v2 => vars.add(v2));
        const combination = [];
        for (let v of vars.values()) {
            combination.push([v, cnum.add(cnum.mul(c, coefficient(v)),
                                          cnum.mul(c2, e2.coefficient(v)))]);
        }
        return makeLinearExpr(cnum.add(cnum.mul(c, constant),
                                       cnum.mul(c2, e2.constant)),
                              combination);
    }
    
    // Return an equivalent equation with a variable's coefficient
    // rescaled to 1.
    function normalize() {
        return scale(cnum.reciprocal(coefficient(aVariable())));
    }

    // Return me multiplied by c.
    function scale(c) {
        return combine(c, zeroExpr, cnum.zero);
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
        isInconsistent: () => isConstant() && !cnum.eq(constant, cnum.zero),
        isTautology:    () => isConstant() &&  cnum.eq(constant, cnum.zero),
        definesVar: () => {
            if (terms.length === 1 && cnum.eq(terms[0][1], cnum.one)) return terms[0][0];
            return null;
        },
        substituteFor: substituteFor,
        normalize: normalize,
        combine: combine,
    };               
}

const zeroExpr = makeLinearExpr(cnum.zero, []);

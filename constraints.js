// Solving linear equality constraints

'use strict';

// Return an object mapping variable to solution, for those
// variables that eqns constrains to a value.
function solveEquations(eqns) {
    var reduced = reduceEquations(eqns);
    if (!reduced.isConsistent) {
        return {};
    } else {
        var result = {};
        reduced.equations.forEach(function (eqn) {
            var v = eqn.definesVar();
            if (v !== null) {
//                result[v] = rmul(-1, eqn.constant);
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
    for (var i = 0; i < eqns.length; ++i) {
        var eqi = eqns[i];
        var v = eqi.aVariable();
        if (v === null) continue;
        for (var j = 0; j < eqns.length; ++j) {
            if (i === j) continue;
            eqns[j] = eqns[j].substituteFor(v, eqi);
            if (eqns[j].isInconsistent()) {
                return {isConsistent: false};
            }
        }
    };
    return {isConsistent: true,
            equations: (eqns.filter(function(eqn) { return !eqn.isTautology(); })
                            .map(function(eqn) { return eqn.normalize(); }))};
}

function makeLinearExpr(constant, terms) {
    // Invariant: all variables distinct.
    // Invariant: no term with a 0 coefficient.

    terms = terms.filter(function(pair) { return pair[1] !== 0; });

    function getVariables() {
        return terms.map(function(pair) { return pair[0]; });
    }

    function coefficient(v) {
        for (var i = 0; i < terms.length; ++i)
            if (terms[i][0] === v)
                return terms[i][1];
        return 0;               // XXX zero for complex
    }

    // Return an equivalent equation with var eliminated by
    // resolving against eq (which must have a term for var).
    function substituteFor(v, expr) {
//        var c = rmul(-1, div(coefficient(v), expr.coefficient(v))
        var c = -coefficient(v) / expr.coefficient(v);
        return combine(1, expr, c);
    }

    function combine(c, e2, c2) {
        var vars = new Set(getVariables());
        e2.getVariables().forEach(function(v2) { vars.add(v2); });
        var combination = [];
        for (var v of vars.values()) {
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
        constant: constant,
        _terms: terms,
        getVariables: getVariables,
        coefficient: coefficient,
        aVariable: aVariable,
        isInconsistent: function() {
            return isConstant() && constant !== 0; // XXX zero for complex
        },
        isTautology: function() {
            return isConstant() && constant === 0;
        },
        definesVar: function() {
            if (terms.length === 1 && terms[0][1] == 1) return terms[0][0];
            return null;
        },
        substituteFor: substituteFor,
        normalize: normalize,
        combine: combine,
    };               
}

var zeroExpr = makeLinearExpr(0, []);

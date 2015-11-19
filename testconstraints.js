// Dumb little smoke test

function mkeq(c, terms) {
    return makeLinearExpr(-c, terms);
}

console.log(reduceEquations([]));
console.log(reduceEquations([mkeq(0, [])]));

var eqs0 = [mkeq(10, [['x', 1]])];
console.log('eqs0');
console.log(reduceEquations(eqs0));
console.log(solveEquations(eqs0));

var eqs1 = [mkeq(10, [['x', 2]])];
console.log('eqs1');
console.log(reduceEquations(eqs1));
console.log(solveEquations(eqs1));


var eqs10 = [mkeq(13, [['x', 1]]),
             mkeq(7, [['y', 2]])];
console.log('eqs10');
console.log(reduceEquations(eqs10));
console.log(solveEquations(eqs10));


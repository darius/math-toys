// Dumb little smoke test

function mkeq(c, terms) {
    return makeLinearExpr(cnum.neg(c), terms);
}

console.log(reduceEquations([]));
console.log(reduceEquations([mkeq(cnum.zero, [])]));

var eqs0 = [mkeq({re: 10, im: 0}, [['x', cnum.one]])];
console.log('eqs0', eqs0[0].show());
console.log(reduceEquations(eqs0));
console.log(showSolution(solveEquations(eqs0)));

var eqs1 = [mkeq({re: 10, im: 0}, [['x', {re: 2, im: 0}]])];
console.log('eqs1', eqs1[0].show());
console.log(reduceEquations(eqs1));
console.log(showSolution(solveEquations(eqs1)));

var eqs10 = [mkeq({re: 13, im: 0}, [['x', cnum.one]]),
             mkeq({re: 7, im: 0}, [['y', {re: 2, im: 0}]])];
console.log('eqs10', eqs10[0].show(), ',', eqs10[1].show());
console.log(reduceEquations(eqs10));
console.log(showSolution(solveEquations(eqs10)));

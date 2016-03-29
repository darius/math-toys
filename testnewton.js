'use strict';

const cnum = mathtoys.complex;
const adiff = mathtoys.autodiff;
const newton = mathtoys.newton;
const sh = mathtoys.sheet;

let quiver, ui, zArrow, guess, root;   // global/mutable for debugging

function onLoad() {
    quiver = sh.makeQuiver();

    zArrow = quiver.add({op: sh.variableOp, at: {re: 1, im: 1}});
    zArrow.label = 'z';
    
    // XXX we want this to be movable but not selectable -- not exactly isScenery
    guess = quiver.add({op: sh.variableOp, at: {re: 1.6, im: 2.4}});
    guess.label = 'guess';
    
    root = quiver.add({op: sh.constantOp, at: cnum.zero, isScenery: true});
    root.label = 'root';
    
    ui = sh.makeSheetUI(quiver, canvas, {preshow: preshow}, {});
    ui.toggleSelection(zArrow);
    ui.show();
}

function preshow() {
    // Pick the latest computed arrow as our function to find the root of.
    let fnArrow = zArrow;
    quiver.getArrows().forEach(arrow => {
        if (arrow.op !== sh.constantOp
            && arrow.op !== sh.variableOp) {
            fnArrow = arrow;
        }
    });
    function evaluateFn(z) {
        function walk(arrow) {
            if (arrow === zArrow) return adiff.makeVariable(z);
            switch (arrow.op) {
            case sh.constantOp: return adiff.makeConstant(arrow.at);
            case sh.variableOp: return adiff.makeConstant(arrow.at);
            case sh.addOp:      return adiff.add(walk(arrow.arg1), walk(arrow.arg2));
            case sh.mulOp:      return adiff.mul(walk(arrow.arg1), walk(arrow.arg2));
            default: throw new Error("Can't happen");
            }
        }
        return walk(fnArrow);
    }

    try {
        root.at = newton.findRoot(evaluateFn, guess.at);
    } catch (e) {
        console.log(e);
    }
}

function onRename() {
    const arrow = quiver.findLabel(renameFrom.value);
    const newLabel = renameTo.value.trim();
    if (arrow !== null && newLabel !== '') {
        arrow.label = newLabel;
        ui.show();
    }
}

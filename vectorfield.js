// Display a C->C map as a vector field.

'use strict';

const cnum = mathtoys.complex;
const sh = mathtoys.sheet;

let quiver, sheet, ui;
let zVar;

function onLoad() {
    quiver = sh.makeQuiver();
    zVar = quiver.add({op: sh.variableOp, at: {re: 1, im: 1}});
    zVar.label = 'z';
    ui = sh.makeSheetUI(quiver, canvas1, {}, {});
    ui.show();

    sheet = sh.makeSheet(canvas2);
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    sh.drawVectorField(sheet, z => z, 0.10, 15);

    quiver.addWatcher(onChange);

    function onChange(event) {
        if (event.tag === 'add') {
            addSheet(event.arrow);
        } else {
            update();
        }
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

// Pairs of [arrow, sheet].
const pairs = [];

function addSheet(arrow) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas1.width;
    canvas.height = canvas1.height;
    document.getElementById('sheets').appendChild(canvas);
    document.getElementById('sheets').appendChild(document.createTextNode(' '));
    const sheet = sh.makeSheet(canvas);
    pairs.push([arrow, sheet]);
    update();
}

const pendingUpdates = [];

function update() {
    // Schedule pending updates round-robin style, to avoid starving
    // the updating of the later elements of pairs.
    pairs.filter(complement(isPending)).forEach(p => {
        pendingUpdates.push(p);
    });
    cancelAnimationFrame(doUpdates);
    requestAnimationFrame(doUpdates);
}

function isPending([arrow, _]) {
    return pendingUpdates.some(([pendingArrow, _]) => arrow === pendingArrow);
}

function complement(predicate) {
    return x => !predicate(x);
}

function doUpdates() {
    if (0 < pendingUpdates.length) {
        const startTime = Date.now();
        const pair = pendingUpdates[0];
        doUpdate(pair);
        pendingUpdates.splice(0, 1);
        requestAnimationFrame(doUpdates);
        console.log(Date.now() - startTime, pair[0].label);
    }
}

function doUpdate([arrow, sheet]) {
    const f = quiver.asFunction(zVar, arrow);
    sheet.clear();
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    sh.drawVectorField(sheet, f, 0.05, 15);
}

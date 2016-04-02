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
        if (!watching) return;
        if (event.tag === 'add') {
            addSheet(event.arrow);
        } else {
            update();
        }
    }
}

let watching = true;

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

function isPending(p) {
    return pendingUpdates.some(q => q[0] === p[0]);
}

function complement(predicate) {
    return x => !predicate(x);
}

function doUpdates() {
    if (0 < pendingUpdates.length) {
        doUpdate(pendingUpdates[0]);
        pendingUpdates.splice(0, 1);
        requestAnimationFrame(doUpdates);
    }
}

function doUpdate(pair) {
    const savedAt = zVar.at;
    watching = false;
//    console.log('doUpdate', pair[0].label);

    const arrow = pair[0];
    const sheet = pair[1];
    sheet.clear();
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    let f;
    if (arrow.op === sh.variableOp) {
        const c = arrow.at;
        f = z => c;
    } else {
        f = z => {
            zVar.at = z;
            quiver.onMove();
            return arrow.at;
        }
    }
    sh.drawVectorField(sheet, f, 0.05, 15);

    zVar.at = savedAt;     // XXX ugh hack
    quiver.onMove();
    watching = true;
}

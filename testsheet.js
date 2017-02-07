'use strict';

const cnum = mathtoys.complex;
const sh = mathtoys.sheet;

let quiver, ui;                     // global/mutable for debugging

function onLoad() {
    // Try to fill the window, but leave some space for controls, and
    // hit a size that makes the grid lines occupy one pixel exactly.
    // XXX this is a poor place for the latter calculation -- should instead
    //  do a similar one in makeSheet, using all of the canvas but adjusting
    //  the grid size.
    let sideLimit = Math.min(window.innerWidth - 20,
                             window.innerHeight - 100);
    const gridLines = 8*5;
    const side = Math.floor(sideLimit / gridLines) * gridLines;
    canvas.width = side;
    canvas.height = side;

    quiver = sh.makeQuiver();
    ui = sh.makeSheetUI(quiver, canvas, {}, {});
    ui.show();

    quiver.addWatcher(onChange);
    function onChange(event) {
        if (event.tag !== 'add') {
            update();
        }
    }
}

function onPin() {
    ui.pinSelection();
    ui.show();
}

function onMerge() {
    ui.merge();
    ui.show();
}

function onShowField() {
    const input = quiver.getIndependentVariable();
    const selection = ui.getSelection();
    if (input !== null && 0 < selection.length) {
        addSheet(input, selection[0]);
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


// Vector field stuff:

let zVar;

// Pairs of [arrow, sheet].
const pairs = [];

function addSheet(domainArrow, rangeArrow) {
    zVar = domainArrow; // XXX

    const newDiv = document.createElement('div');
    newDiv.className = 'workspace';

    const newCanvas = document.createElement('canvas');
    const size = {width: 500, height: 500}; // XXX
    newCanvas.width = size.width;
    newCanvas.height = size.height;
    const newSheet = sh.makeSheet(newCanvas);
    pairs.push([rangeArrow, newSheet]); // XXX
    newDiv.appendChild(newCanvas);

    newDiv.appendChild(document.createElement('br'));
    const deleteButton = document.createElement('input');
    deleteButton.type = 'button';
    deleteButton.value = 'Delete';
    deleteButton.addEventListener('click', deleteSheet);
    newDiv.appendChild(deleteButton);
    const label = ('   ' + domainArrow.label + ' \u2192 ' // (right arrow char)
                   + rangeArrow.label);
    newDiv.appendChild(document.createTextNode(label));

    document.getElementById('sheets').appendChild(newDiv);
    document.getElementById('sheets').appendChild(document.createTextNode(' '));
    update();

    function deleteSheet() {
        deleteFromArray(pairs,          ([arrow, sheet]) => sheet === newSheet);
        deleteFromArray(pendingUpdates, ([arrow, sheet]) => sheet === newSheet);
        newDiv.remove();
    }
}

function deleteFromArray(array, isUnwanted) {
    for (let i = array.length - 1; 0 <= i; --i) {
        if (isUnwanted(array[i])) array.splice(i, 1);
    }
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
        if (0) console.log(Date.now() - startTime, pair[0].label);
    }
}

function doUpdate([arrow, sheet]) {
    const f = quiver.asFunction(zVar, arrow);
    sheet.clear();
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    sh.drawVectorField(sheet, f, 0.05, 15);
}


// unused now:

function tempTest() {
    const sheet = sh.makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.lineWidth = 1;
    sheet.ctx.strokeStyle = 'black';
    sheet.ctx.fillStyle = 'blue';
    sheet.drawDot(cnum.one, 3);
    sheet.drawLine(cnum.one, {re: 2, im: 1});
    sheet.drawText(cnum.one, '1', {x: -14, y: 10});
    sheet.drawSpiral(cnum.one, {re: 2, im: 1}, {re: 2, im: 1});
    console.log(sheet.pointFromXY({x: 400, y: 0}));

    const i = quiver.add({op: sh.constantOp, at: {re: 0, im: 1}});
    sheet.drawDot(i.at, sh.dotRadius);
    sheet.drawText(i.at, i.label, i.op.labelOffset);

    const v = quiver.add({op: sh.variableOp, at: {re: 2.1, im: -1}});
    sheet.drawDot(v.at, sh.dotRadius);
    sheet.drawText(v.at, v.label, v.op.labelOffset);
}

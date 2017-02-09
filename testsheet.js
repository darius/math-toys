'use strict';

const cnum = mathtoys.complex;
const sh = mathtoys.sheet;

let quiver, ui;                     // global/mutable for debugging

function onLoad() {
    quiver = sh.makeQuiver();
    const sheetGroup = makeSheetGroup(quiver);
    document.getElementById('theSheets').appendChild(sheetGroup.element);
    const canvas = sheetGroup.canvas;

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

    ui = sh.makeSheetUI(quiver, canvas, {}, {});
    ui.show();

    quiver.addWatcher(event => {
        if (event.tag !== 'add') update();
    });
}

var mergeButton;                // XXX ditto
var renameFrom;                 // XXX ditto

function makeSheetGroup(quiver) {
    const group = document.createElement('div');
    group.className = 'sheetgroup';

    const mainSheet = document.createElement('div');
    mainSheet.className = 'mainsheet';

    const canvas = document.createElement('canvas');
    // TODO .disabled = true
    const pinButton = makeButton("Pin/unpin points", onPin);
    mergeButton = makeButton("Merge points", onMerge);
    mergeButton.disabled = true;
    renameFrom = makeTextInput(5);
    const renameTo = makeTextInput(5);

    mainSheet.appendChild(canvas);
    mainSheet.appendChild(document.createElement('br'));
    mainSheet.appendChild(pinButton);
    mainSheet.appendChild(mergeButton);
    mainSheet.appendChild(makeButton("Show field", onShowField));
    mainSheet.appendChild(document.createElement('br'));
    mainSheet.appendChild(document.createTextNode("Rename "));
    mainSheet.appendChild(renameFrom);
    mainSheet.appendChild(document.createTextNode(" to "));
    mainSheet.appendChild(renameTo);
    mainSheet.appendChild(makeButton("Rename", onRename));

    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'fieldgroup';

    group.appendChild(mainSheet);
    group.appendChild(fieldGroup);
    return {
        element: group,
        canvas: canvas,
    };

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
            addSheet(fieldGroup, input, selection[0]);
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
}

function makeButton(value, onClick) {
    const button = document.createElement('input');
    button.type = 'button';
    button.value = value;
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

function makeTextInput(size) {
    const element = document.createElement('input');
    element.type = 'text';
    element.size = size;
    return element;
}


// Vector field stuff:

let zVar;

// Pairs of [arrow, sheet].
const pairs = [];

function addSheet(group, domainArrow, rangeArrow) {
    zVar = domainArrow; // XXX

    const newDiv = document.createElement('div');
    newDiv.className = 'fieldsheet';

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

    group.appendChild(newDiv);
    group.appendChild(document.createTextNode(' '));
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

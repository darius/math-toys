'use strict';

const cnum = mathtoys.complex;
const sh = mathtoys.sheet;

let quiver, ui;                     // global/mutable for debugging

function onLoad() {
    quiver = sh.makeQuiver();
    ui = sh.makeSheetUI(quiver, canvas, {}, {});
    ui.show();
}

function onPin() {
    ui.pinSelection();
}

function onRename() {
    const arrow = quiver.findLabel(renameFrom.value);
    const newLabel = renameTo.value.trim();
    if (arrow !== null && newLabel !== '') {
        arrow.label = newLabel;
        ui.show();
    }
}

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

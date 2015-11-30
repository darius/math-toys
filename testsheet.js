'use strict';

var cnum = mathtoys.complex;
var sh = mathtoys.sheet;

var quiver;                     // for debug

function onLoad() {
    quiver = sh.makeQuiver();
    var ui = sh.makeSheetUI(quiver, canvas, {}, {});
    ui.show();
}

function tempTest() {
    var sheet = sh.makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.lineWidth = 1;
    sheet.ctx.strokeStyle = 'black';
    sheet.ctx.fillStyle = 'blue';
    sheet.drawDot(cnum.one, 3);
    sheet.drawLine(cnum.one, {re: 2, im: 1});
    sheet.drawText(cnum.one, '1', {x: -14, y: 10});
    sheet.drawSpiral(cnum.one, {re: 2, im: 1}, {re: 2, im: 1});
    console.log(sheet.pointFromXY({x: 400, y: 0}));

    var i = quiver.add({op: sh.constantOp, at: {re: 0, im: 1}});
    sheet.drawDot(i.at, sh.dotRadius);
    sheet.drawText(i.at, i.label, i.op.labelOffset);

    var v = quiver.add({op: sh.variableOp, at: {re: 2.1, im: -1}});
    sheet.drawDot(v.at, sh.dotRadius);
    sheet.drawText(v.at, v.label, v.op.labelOffset);
}

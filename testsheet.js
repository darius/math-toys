'use strict';

var quiver;                     // for debug
var canvas;

window.onload = function() {
    canvas = document.getElementById("canvas");
    quiver = sheet.makeQuiver();
    var ui = sheet.makeSheetUI(quiver, canvas, { width: 800, height: 800 }, {});
    ui.show();
}

function tempTest() {
    var sheetObj = sheet.makeSheet(canvas);
    sheetObj.drawGrid();
    sheetObj.ctx.lineWidth = 1;
    sheetObj.ctx.strokeStyle = 'black';
    sheetObj.ctx.fillStyle = 'blue';
    sheetObj.drawDot(complex.one, 3);
    sheetObj.drawLine(complex.one, {re: 2, im: 1});
    sheetObj.drawText(complex.one, '1', {x: -14, y: 10});
    sheetObj.drawSpiral(complex.one, {re: 2, im: 1}, {re: 2, im: 1});
    console.log(sheetObj.pointFromXY({x: 400, y: 0}));

    var i = quiver.add({op: sheet.constantOp, at: {re: 0, im: 1}});
    sheetObj.drawDot(i.at, sheet.dotRadius);
    sheetObj.drawText(i.at, i.label, i.op.labelOffset);

    var v = quiver.add({op: sheet.variableOp, at: {re: 2.1, im: -1}});
    sheetObj.drawDot(v.at, sheet.dotRadius);
    sheetObj.drawText(v.at, v.label, v.op.labelOffset);
}

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
    sheetObj.drawDot(one, 3);
    sheetObj.drawLine(one, {re: 2, im: 1});
    sheetObj.drawText(one, '1', {x: -14, y: 10});
    sheetObj.drawSpiral(one, {re: 2, im: 1}, {re: 2, im: 1});
    console.log(sheetObj.pointFromXY({x: 400, y: 0}));

    var i = quiver.add({op: constantOp, at: {re: 0, im: 1}});
    sheetObj.drawDot(i.at, dotRadius);
    sheetObj.drawText(i.at, i.label, i.op.labelOffset);

    var v = quiver.add({op: variableOp, at: {re: 2.1, im: -1}});
    sheetObj.drawDot(v.at, dotRadius);
    sheetObj.drawText(v.at, v.label, v.op.labelOffset);
}

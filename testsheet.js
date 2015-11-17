'use strict';

var quiver;                     // for debug

function onLoad() {
    quiver = makeQuiver();
    var ui = makeSheetUI(quiver, canvas, { width: 800, height: 800 }, {});
    ui.show();
}

function tempTest() {
    var sheet = makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.lineWidth = 1;
    sheet.ctx.strokeStyle = 'black';
    sheet.ctx.fillStyle = 'blue';
    sheet.drawDot(one, 3);
    sheet.drawLine(one, {re: 2, im: 1});
    sheet.drawText(one, '1', {x: -14, y: 10});
    sheet.drawSpiral(one, {re: 2, im: 1}, {re: 2, im: 1});
    console.log(sheet.pointFromXY({x: 400, y: 0}));

    var i = quiver.add({op: constantOp, at: {re: 0, im: 1}});
    sheet.drawDot(i.at, dotRadius);
    sheet.drawText(i.at, i.label, i.op.labelOffset);

    var v = quiver.add({op: variableOp, at: {re: 2.1, im: -1}});
    sheet.drawDot(v.at, dotRadius);
    sheet.drawText(v.at, v.label, v.op.labelOffset);
}

// Display a C-C map as a vector field.

'use strict';

function onLoad() {
    var sheet = makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    drawMap(sheet,
            function(z) {
                return mul(z, mul(z, z));
            },
            0.05, 20);
}

function drawMap(sheet, f, vectorScale, spacing) {
    var ctx = sheet.ctx;
    var scale = sheet.scale;
    vectorScale *= scale;
    console.log(vectorScale);
    ctx.globalAlpha = 0.5;
    var height = sheet.canvas.height;
    var width  = sheet.canvas.width;
    for (var y = 0; y < height; y += spacing) {
        for (var x = 0; x < width; x += spacing) {
            var z0 = sheet.pointFromXY({x: x, y: y});
            var z1 = f(z0);
            var x0 = scale * z0.re;  // XXX ugh
            var y0 = scale * z0.im;
            var dx = vectorScale * z1.re;
            var dy = vectorScale * z1.im;
            var nsteps = 5;
            for (var i = 0; i < nsteps; ++i) {
                ctx.lineWidth = (nsteps-i) * 0.5;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                x0 += dx/nsteps;
                y0 += dy/nsteps;
                ctx.lineTo(x0, y0);
//            console.log(vectorScale * z1.re, vectorScale * z1.im);
                ctx.stroke();
            }
        }
    }
}

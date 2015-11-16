// Display a C-C map as a vector field.

'use strict';

var sheet;
function onLoad() {
    sheet = makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    drawMap(sheet,
            function(z) {
//                return mul(z, z);
                return mul(z, mul(z, z));
                return mul(z, mul(z, mul(z, z)));
            },
            0.05, 15);
}

function drawMap(sheet, f, vectorScale, spacing) {
    var ctx = sheet.ctx;
    ctx.globalAlpha = 0.25;
    var height = sheet.canvas.height;
    var width  = sheet.canvas.width;
    for (var y = 0; y < height; y += spacing) {
        for (var x = 0; x < width; x += spacing) {
            var z = sheet.pointFromXY({x: x, y: y});
            drawStreamline(sheet, z, f, vectorScale);
        }
    }
}

function drawStreamline(sheet, z, f, vectorScale) {
    var ctx = sheet.ctx;
    var scale = sheet.scale;
    var nsteps = 10;
    for (var i = 0; i < nsteps; ++i) {
        ctx.lineWidth = (nsteps-i) * 0.5;
        var dz = rmul(vectorScale/nsteps, f(z));
        if (1 && (scale*scale)*(0.001) < squaredMagnitude(dz)) {
            // We going too far and might end up with random-looking
            // sharp-angled paths. Stop and let this streamline get
            // approximately filled in from some other starting point.
            break;
        }
        var z1 = add(z, dz);

        ctx.beginPath();
        ctx.moveTo(scale*z.re, scale*z.im);
        ctx.lineTo(scale*z1.re, scale*z1.im);
        ctx.stroke();

        z = z1;
    }
}

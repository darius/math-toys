// Display a C->C map as a vector field.

'use strict';

var ctx1, ctx2;
var quiver, sheetObj;
var xVar;

window.onload = function() {
    ctx1 = document.getElementById("canvas1").getContext("2d");
    ctx2 = document.getElementById("canvas2").getContext("2d");
    quiver = sheet.makeQuiver();
    xVar = quiver.add({op: sheet.variableOp, at: {re: 1, im: 1}});
    xVar.label = 'x';
    var ui = sheet.makeSheetUI(quiver, ctx1, {}, {});
    ui.show();

    sheetObj = sheet.makeSheet(ctx2);
    sheetObj.drawGrid();
    sheetObj.ctx.strokeStyle = 'black';
    drawMap(sheetObj,
            function(z) { return z; },
            0.05, 15);

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

var watching = true;

// Pairs of [arrow, sheetObj].
var pairs = [];

function addSheet(arrow) {
    var ctx = document.createElement('canvas').getContext("2d");
    ctx.canvas.height = ctx1.canvas.height;
    ctx.canvas.width = ctx1.canvas.width;
    document.getElementById('sheets').appendChild(ctx.canvas);
    document.getElementById('sheets').appendChild(document.createTextNode(' '));
    var sheetObj = sheet.makeSheet(ctx);
    pairs.push([arrow, sheetObj]);
    update();
}

function update() {
    var savedAt = xVar.at;
    watching = false;
    pairs.forEach(function(p) {
        var arrow = p[0];
        var sheetObj = p[1];
        sheetObj.clear();
        sheetObj.drawGrid();
        sheetObj.ctx.strokeStyle = 'black';
        var f;
        if (arrow.op === sheet.variableOp) {
            var c = arrow.at;
            f = function(z) { return c; };
        } else {
            f = function(z) {
                xVar.at = z;
                quiver.onMove();
                return arrow.at;
            }
        }
        drawMap(sheetObj, f, 0.05, 15);
    });
    xVar.at = savedAt;     // XXX ugh hack
    quiver.onMove();
    watching = true;
}

function drawMap(sheetObj, f, vectorScale, spacing) {
    var ctx = sheetObj.ctx;
    ctx.globalAlpha = 0.25;
    var height = sheetObj.ctx.canvas.height;
    var width  = sheetObj.ctx.canvas.width;
    for (var y = 0; y < height; y += spacing) {
        for (var x = 0; x < width; x += spacing) {
            var z = sheetObj.pointFromXY({x: x, y: y});
            drawStreamline(sheetObj, z, f, vectorScale);
        }
    }
}

function drawStreamline(sheetObj, z, f, vectorScale) {
    var ctx = sheetObj.ctx;
    var scale = sheetObj.dims.scale;
    var nsteps = 10;
    for (var i = 0; i < nsteps; ++i) {
        ctx.lineWidth = (nsteps-i) * 0.5;
        var dz = complex.rmul(vectorScale/nsteps, f(z));
        if (1 && (scale*scale)*(0.001) < complex.squaredMagnitude(dz)) {
            // We going too far and might end up with random-looking
            // sharp-angled paths. Stop and let this streamline get
            // approximately filled in from some other starting point.
            break;
        }
        var z1 = complex.add(z, dz);

        ctx.beginPath();
        ctx.moveTo(scale*z.re, scale*z.im);
        ctx.lineTo(scale*z1.re, scale*z1.im);
        ctx.stroke();

        z = z1;
    }
}

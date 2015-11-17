// Display a C->C map as a vector field.

'use strict';

var quiver, sheet;
var xVar;
var CANVAS_WIDTH_HEIGHT = { width: 300, height: 300 };

window.onload = function() {
    var canvas1 = document.getElementById("canvas1");
    var canvas2 = document.getElementById("canvas2");
    quiver = makeQuiver();
    xVar = quiver.add({op: variableOp, at: {re: 1, im: 1}});
    xVar.label = 'x';
    var ui = makeSheetUI(quiver, canvas1, CANVAS_WIDTH_HEIGHT, {});
    ui.show();

    sheet = makeSheet(canvas2, CANVAS_WIDTH_HEIGHT);
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    drawMap(sheet,
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

// Pairs of [arrow, sheet].
var pairs = [];

function addSheet(arrow) {
    var canvas = document.createElement('canvas');
    document.getElementById('sheets').appendChild(canvas);
    document.getElementById('sheets').appendChild(document.createTextNode(' '));
    var sheet = makeSheet(canvas, CANVAS_WIDTH_HEIGHT);
    pairs.push([arrow, sheet]);
    update();
}

function update() {
    var savedAt = xVar.at;
    watching = false;
    pairs.forEach(function(p) {
        var arrow = p[0];
        var sheet = p[1];
        sheet.clear();
        sheet.drawGrid();
        sheet.ctx.strokeStyle = 'black';
        var f;
        if (arrow.op === variableOp) {
            var c = arrow.at;
            f = function(z) { return c; };
        } else {
            f = function(z) {
                xVar.at = z;
                quiver.onMove();
                return arrow.at;
            }
        }
        drawMap(sheet, f, 0.05, 15);
    });
    xVar.at = savedAt;     // XXX ugh hack
    quiver.onMove();
    watching = true;
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

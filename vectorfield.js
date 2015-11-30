// Display a C->C map as a vector field.

'use strict';

var cnum = mathtoys.complex;
var sh = mathtoys.sheet;

var quiver, sheet;
var xVar;

function onLoad() {
    quiver = sh.makeQuiver();
    xVar = quiver.add({op: sh.variableOp, at: {re: 1, im: 1}});
    xVar.label = 'x';
    var ui = sh.makeSheetUI(quiver, canvas1, {}, {});
    ui.show();

    sheet = sh.makeSheet(canvas2);
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
    canvas.width = canvas1.width;
    canvas.height = canvas1.height;
    document.getElementById('sheets').appendChild(canvas);
    document.getElementById('sheets').appendChild(document.createTextNode(' '));
    var sheet = sh.makeSheet(canvas);
    pairs.push([arrow, sheet]);
    update();
}

var pendingUpdates = [];

function update() {
    // Schedule pending updates round-robin style, to avoid starving
    // the updating of the later elements of pairs.
    pairs.filter(complement(isPending)).forEach(function (p) {
        pendingUpdates.push(p);
    });
    cancelAnimationFrame(doUpdates);
    requestAnimationFrame(doUpdates);
}

function isPending(p) {
    return pendingUpdates.some(function(q) { return q[0] === p[0]; });
}

function complement(predicate) {
    return function(x) { return !predicate(x); };
}

function doUpdates() {
    if (0 < pendingUpdates.length) {
        doUpdate(pendingUpdates[0]);
        pendingUpdates.splice(0, 1);
        requestAnimationFrame(doUpdates);
    }
}

function doUpdate(pair) {
    var savedAt = xVar.at;
    watching = false;
    console.log('doUpdate', pair[0].label);

    var arrow = pair[0];
    var sheet = pair[1];
    sheet.clear();
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    var f;
    if (arrow.op === sh.variableOp) {
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
        var dz = cnum.rmul(vectorScale/nsteps, f(z));
        if (1 && (scale*scale)*(0.001) < cnum.squaredMagnitude(dz)) {
            // We going too far and might end up with random-looking
            // sharp-angled paths. Stop and let this streamline get
            // approximately filled in from some other starting point.
            break;
        }
        var z1 = cnum.add(z, dz);

        ctx.beginPath();
        ctx.moveTo(scale*z.re, scale*z.im);
        ctx.lineTo(scale*z1.re, scale*z1.im);
        ctx.stroke();

        z = z1;
    }
}

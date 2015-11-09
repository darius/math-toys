// A canvas UI to complex-number arithmetic.
// Let's call complex numbers 'arrows' here. ComplexNumber would be a mouthful.

'use strict';

var maxClickDistance = 2;
var minSelectionDistance = 20;
var dotRadius = 3;
var selectedDotRadius = 10;

function onLoad() {
    var quiver = makeQuiver();
    var sheet = makeSheet(canvas);
    sheet.drawGrid();
    sheet.ctx.lineWidth = 1;
    sheet.ctx.strokeStyle = 'black';
    sheet.ctx.fillStyle = 'blue';
    sheet.drawDot(one, 3);
    sheet.drawLine(one, {re: 2, im: 1});
    sheet.drawText(one, '1', {x: -14, y: 10});
    sheet.drawSpiral(one, {re: 2, im: 1}, {re: 2, im: 1});
}

// A quiver is a collection of arrows, with dependencies between some of them.
// The arrows can move, and can be added or removed from the collection.
// It's the 'model' with respect to the sheet UI.
function makeQuiver() {

    var arrows = [];

    function isEmpty() {
        return 0 < arrows.length;
    }

    function getArrows() {
        return arrows;
    }

    function getFreeArrows() {
        return arrows.filter(function(arrow) { return arrow.op === variableOp; });
    }

    function add(arrow) {
        arrow.label = arrow.op.label(arrow, quiver);
        arrows.push(arrow);
        recompute(arrow);
        return arrow;
    }

    function onMove() {
        arrows.forEach(recompute);
    }

    function recompute(arrow) {
        arrow.op.recompute(arrow);
    }

    var quiver = {
        add: add,
        isEmpty: isEmpty,
        getArrows: getArrows,
        getFreeArrows: getFreeArrows,
        moveTo: moveTo,
        onMove: onMove,
    };
    return quiver;
}

var tau = 2*Math.PI;

function makeSheet(canvas, options) {
    options = override({center:   zero,
                        font:     '12pt Georgia',
                        realSpan: 8},
                       options);

    var ctx    = canvas.getContext('2d');
    var width  = canvas.width;   // N.B. it's best if these are even
    var height = canvas.height;
    var left   = -width/2;
    var right  =  width/2;
    var bottom = -height/2;
    var top    =  height/2;
    var scale  = width / options.realSpan;

    function pointFromXY(xy) {
        return {re: xy.x / scale, im: xy.y / scale};
    }

    ctx.font = options.font;
    ctx.translate(right, top);
    ctx.scale(1, -1);

    if (options.center.re !== 0 || options.center.im !== 0) {
        throw new Error("off-center sheet not supported yet");
    }

    function clear() {
        ctx.clearRect(left, bottom, width, height);
    }

    function drawDot(at, radius) {
        ctx.beginPath();
        ctx.arc(scale * at.re, scale * at.im, radius, 0, tau);
        ctx.fill();
    }

    function drawLine(at1, at2) {
        ctx.beginPath();
        ctx.moveTo(scale * at1.re, scale * at1.im);
        ctx.lineTo(scale * at2.re, scale * at2.im);
        ctx.stroke();
    }

    // N.B. textOffset is in canvas (xy) coordinates.
    function drawText(at, text, textOffset) {
        var x = at.re * scale + textOffset.x;
        var y = at.im * scale + textOffset.y;
        ctx.save();
        ctx.scale(1, -1); // Back into left-handed coordinates so the text isn't flipped
        ctx.fillText(text, x, -y);
        ctx.restore();
    }

    // Draw an arc from cnum u to uv (which should be u*v).
    function drawSpiral(u, v, uv) {
        var zs = computeSpiralArc(u, v, uv);
        var path = [];
        zs.forEach(function(z) {
            path.push(scale * z.re);
            path.push(scale * z.im);
        });
        drawSpline(ctx, path, 0.4, false);
    }

    function drawGrid() {
        var i, j;
        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        for (i = 1; (i-1) * scale <= right; ++i) { // XXX hack
            ctx.globalAlpha = .25;
            for (j = 1; j <= 9; ++j) {
                gridLines((i-1 + j/10) * scale, bottom, (i-1 + j/10) * scale, top);
            }
            ctx.globalAlpha = 1;
            gridLines(i * scale, bottom, i * scale, top);
        }
        for (i = 1; (i-1) * scale <= top; ++i) { // XXX hack
            ctx.globalAlpha = .25;
            for (j = 1; j <= 9; ++j) {
                gridLines(left, (i-1 + j/10) * scale, right, (i-1 + j/10) * scale);
            }
            ctx.globalAlpha = 1;
            gridLines(left, i * scale, right, i * scale);
        }

        ctx.fillStyle = 'white';
        ctx.fillRect(left, -1, width, 3);
        ctx.fillRect(-1, bottom, 3, height);

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, scale, 0, tau, true);
        ctx.closePath();
        ctx.stroke();
    }
    
    function gridLines(x0, y0, x1, y1) {
        gridLine(x0, y0, x1, y1);
        gridLine(-x0, -y0, -x1, -y1);
    }

    function gridLine(x0, y0, x1, y1) {
        drawLineXY(x0 - .5, y0 - .5, x1 - .5, y1 - .5); // - .5 for sharp grid lines
    }

    function drawLineXY(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    function translate(at) {
        ctx.translate(at.re * scale, at.im * scale);
    }

    return {
        clear: clear,
        ctx: ctx,
        drawDot: drawDot,
        drawGrid: drawGrid,
        drawLine: drawLine,
        drawSpiral: drawSpiral,
        drawText: drawText,
        pointFromXY: pointFromXY,
        scale: scale,
        translate: translate,
    };
}


// Helpers

function noOp() { }

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
var override =
    (Object.assign ? Object.assign : function(obj1, obj2) {
        for (var k in obj2) {
            if (({}).hasOwnProperty.call(obj2, k)) {
                obj1[k] = obj2[k];
            }
        }
        return obj1;
    });

// Return a sequence of points along an arc from cnum u to uv.
// Assuming uv = u*v, it should approximate a logarithmic spiral
// similar to one from 1 to v.
function computeSpiralArc(u, v, uv) {
    // Multiples of v^(1/8) as points on the spiral from 1 to v.
    var h4 = roughSqrt(v);
    var h2 = roughSqrt(h4);
    var h1 = roughSqrt(h2);
    var h3 = mul(h2, h1);
    var h5 = mul(h4, h1);
    var h6 = mul(h4, h2);
    var h7 = mul(h4, h3);

    return [u,
            mul(u, h1),
            mul(u, h2),
            mul(u, h3),
            mul(u, h4),
            mul(u, h5),
            mul(u, h6),
            mul(u, h7),
            uv];
}

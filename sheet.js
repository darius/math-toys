// A canvas UI to complex-number arithmetic.
// Let's call complex numbers 'arrows' here. ComplexNumber would be a mouthful.

'use strict';

var maxClickDistance = 2;
var minSelectionDistance = 20;
var dotRadius = 3;
var selectedDotRadius = 10;

// A quiver is a collection of arrows, with dependencies between some of them.
// The arrows can move, and can be added or removed from the collection.
// It's the 'model' with respect to the sheet UI.
function makeQuiver() {

    var arrows = [];
    var watchers = [];

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
        notify({tag: 'add', arrow: arrow});
        return arrow;
    }

    function addWatcher(watcher) {
        watchers.push(watcher);
    }

    function onMove() {
        arrows.forEach(recompute);
        notify({tag: 'move'});
    }

    function notify(event) {
        watchers.forEach(function(watch) { watch(event); });
    }

    function recompute(arrow) {
        arrow.op.recompute(arrow);
    }

    var quiver = {
        add: add,
        addWatcher: addWatcher,
        isEmpty: isEmpty,
        getArrows: getArrows,
        getFreeArrows: getFreeArrows,
        onMove: onMove,
    };
    return quiver;
}

var tau = 2*Math.PI;

// A sheet is a canvas displaying the complex-number plane.
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

    ctx.font = options.font;
    ctx.translate(right, top);
    ctx.scale(1, -1);

    // Convert from canvas-relative pixel coordinates, such as from a mouse event.
    function pointFromXY(xy) {
        return {re: (xy.x - right) / scale, im: (top - xy.y) / scale};
    }

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
            ctx.globalAlpha = 0.25;
            for (j = 1; j <= 9; ++j) {
                gridLines((i-1 + j/10) * scale, bottom, (i-1 + j/10) * scale, top);
            }
            ctx.globalAlpha = 1;
            gridLines(i * scale, bottom, i * scale, top);
        }
        for (i = 1; (i-1) * scale <= top; ++i) { // XXX hack
            ctx.globalAlpha = 0.25;
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
        drawLineXY(x0 - 0.5, y0 - 0.5, x1 - 0.5, y1 - 0.5); // - 0.5 for sharp grid lines
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
        canvas: canvas,
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

// A sheet UI presents a quiver on a sheet, along with state
// and controls for seeing and manipulating the quiver.
function makeSheetUI(quiver, canvas, options, controls) {
    options = override({adding:      true,
                        multiplying: true,
                        showGrid:    true},
                       options);

    var sheet = makeSheet(canvas, options);

    var minSelectionDistance2 = Math.pow(minSelectionDistance / sheet.scale, 2);
    var maxClickDistance2     = Math.pow(maxClickDistance / sheet.scale, 2);

    var selection = [];

    function show() {
        var ctx = sheet.ctx;
        ctx.save();
        sheet.clear();

        ctx.save();
        hand.dragGrid();
        if (options.showGrid) sheet.drawGrid();
        ctx.fillStyle = 'red';
        selection.forEach(showArrowSelected);
        ctx.restore();

        hand.show();

        quiver.getArrows().forEach(showArrowAsMade);

        ctx.restore();
    }

    function showArrowAsMade(arrow) {
        arrow.op.showProvenance(arrow, sheet);
        showArrow(arrow);
    }

    function showArrowSelected(arrow) {
        sheet.drawDot(arrow.at, selectedDotRadius);
    }

    function showArrow(arrow) {
        sheet.ctx.fillStyle = arrow.op.color;
        sheet.drawDot(arrow.at, dotRadius);
        sheet.drawText(arrow.at, arrow.label, arrow.op.labelOffset);
    }

    function onStateChange() {
    }

    function isCandidatePick(at, arrow) {
        return distance2(at, arrow.at) <= minSelectionDistance2;
    }

    var zeroArrow = quiver.add({op: constantOp, at: zero});
    var oneArrow  = quiver.add({op: constantOp, at: one});

    var emptyHand = {
        moveFromStart: noOp,
        onMove: noOp,
        onEnd: noOp,
        dragGrid: noOp,
        show: noOp,
    };

    function onClick(at) {
        var choice = pickTarget(at, quiver.getArrows());
        if (choice !== null) {
            toggleSelection(choice);
        } else {
            quiver.add({op: variableOp, at: at});
        }
    }

    // Select arrow unless already selected, in which case unselect it.
    function toggleSelection(arrow) {
        assert(0 <= selection.length && selection.length <= 1);
        if (arrow !== selection[0]) selection.splice(0, 1, arrow);
        else selection.splice(0, 1);
    }

    function perform(op, at) {
        var target = pickTarget(at, quiver.getArrows());
        if (target !== null) {
            assert(0 <= selection.length && selection.length <= 1);
            selection.forEach(function(argument, i) {
                selection[i] = quiver.add({op: op, arg1: argument, arg2: target});
            });
            assert(0 <= selection.length && selection.length <= 1);
            onStateChange();
        }
    }

    function pickTarget(at, arrows) {
        return pickClosestTo(at, arrows.filter(function(arrow) {
            return isCandidatePick(at, arrow);
        }));
    }

    function pickClosestTo(at, candidates) {
        var result = null;
        candidates.forEach(function(arrow) {
            var d2 = distance2(at, arrow.at);
            if (result === null || d2 < distance2(at, result.at)) {
                result = arrow;
            }
        });
        return result;
    }

    function chooseHand(at) {
        var target = pickTarget(at, quiver.getFreeArrows());
        if (target !== null) {
            return makeMoverHand(target, quiver);
        } else if (options.adding && isCandidatePick(at, zeroArrow)) {
            return makeAddHand(sheet, selection, perform);
        } else if (options.multiplying && isCandidatePick(at, oneArrow)) {
            return makeMultiplyHand(sheet, selection, perform);
        } else {
            return emptyHand;
        }
    }

    var hand = emptyHand;
    var handStartedAt;
    var strayed;

    addPointerListener(canvas, {
        onStart: function(xy) {
            handStartedAt = sheet.pointFromXY(xy);
            strayed = false;
            hand = chooseHand(handStartedAt);
            show();
        },
        onMove: function(xy) {
            if (handStartedAt === undefined) return;
            var at = sheet.pointFromXY(xy);
            strayed = strayed || maxClickDistance2 < distance2(handStartedAt, at);
            hand.moveFromStart(sub(at, handStartedAt));
            hand.onMove();
            show();
        },
        onEnd: function() {
            assert(handStartedAt !== undefined);
            if (!strayed) {
                onClick(handStartedAt); // XXX or take from where it ends?
            } else {
                hand.onEnd();
            }
            hand = emptyHand;
            show();
            handStartedAt = undefined;
        },
    });

    return {
        show: show,
    };
}

function addPointerListener(canvas, listener) {

    function onTouchstart(event) {
        event.preventDefault();     // to disable mouse events
        if (event.touches.length === 1) {
            listener.onStart(touchCoords(canvas, event.touches[0]));
        }
    }

    function onTouchmove(event) {
        if (event.touches.length === 1) {
            // XXX need to track by touch identifier rather than array index
            listener.onMove(touchCoords(canvas, event.touches[0]));
        }
    }

    function onTouchend(event) {
        if (event.touches.length === 0) {
            listener.onEnd();
        } else {
            onTouchmove(event);
        }
    }

    canvas.addEventListener('touchstart', onTouchstart);
    canvas.addEventListener('touchmove',  onTouchmove);
    canvas.addEventListener('touchend',   onTouchend);

    canvas.addEventListener('mousedown', leftButtonOnly(mouseHandler(canvas, listener.onStart)));
    canvas.addEventListener('mousemove', mouseHandler(canvas, listener.onMove));
    canvas.addEventListener('mouseup',   mouseHandler(canvas, function(coords) {
        listener.onMove(coords);
        listener.onEnd();
    }));
}

var constantOp = {
    color: 'blue',
    labelOffset: {x: -12, y: 6},
    label: function(arrow) {
        var z = arrow.at;
        if      (z.im === 0) return '' + z.re;
        else if (z.re === 0) return fmtImag(z.im);
        else                 return '' + z.re + '+' + fmtImag(z.im);
    },
    recompute: noOp,
    showProvenance: noOp,
};

function fmtImag(im) {
    var s = '';
    if (im !== 1) s += im;
    return s + 'i';
}

var variableOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: function(arrow, quiver) {
        return String.fromCharCode(97 + quiver.getFreeArrows().length);
    },
    recompute: noOp,
    showProvenance: function(arrow, sheet) { // XXX fix the caller
        sheet.drawLine(zero, arrow.at);
        sheet.drawSpiral(one, arrow.at, arrow.at);
    }
};

function makeMoverHand(arrow, quiver) {
    var startAt = arrow.at;
    function moveFromStart(offset) {
        arrow.at = add(startAt, offset);
    }
    function onMove() {
        quiver.onMove();
    }
    return {
        moveFromStart: moveFromStart,
        onMove: onMove,
        onEnd: onMove,     // TODO: add to the undo stack
        dragGrid: noOp,
        show: noOp,
    };
}

function makeAddHand(sheet, selection, perform) {
    var adding = zero;
    function moveFromStart(offset) {
        adding = offset;
    }
    function onEnd() {
        perform(addOp, adding);
    }
    return {
        moveFromStart: moveFromStart,
        onMove: noOp,
        onEnd: onEnd,
        dragGrid: function() {
            sheet.translate(adding);
        },
        show: function() {
            sheet.ctx.strokeStyle = 'magenta';
            sheet.drawLine(zero, adding);
            selection.forEach(function(arrow) {
                sheet.drawLine(arrow.at, add(arrow.at, adding));
            });
        }
    };
}

function makeMultiplyHand(sheet, selection, perform) {
    var multiplying = one;
    function moveFromStart(offset) {
        multiplying = add(one, offset);
    }
    function onEnd() {
        perform(mulOp, multiplying);
    }
    return {
        moveFromStart: moveFromStart,
        onMove: noOp,
        onEnd: onEnd,
        dragGrid: function() {
            sheet.ctx.transform(multiplying.re, multiplying.im, -multiplying.im, multiplying.re, 0, 0);
        },
        show: function() {
            sheet.ctx.strokeStyle = 'green';
            sheet.drawSpiral(one, multiplying, multiplying);
            selection.forEach(function(arrow) {
                sheet.drawSpiral(arrow.at, multiplying, mul(arrow.at, multiplying));
            });
        }
    };
}

var addOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: function(arrow) {
        if (arrow.arg1 === arrow.arg2) {
            return '2' + parenthesize(arrow.arg1.label);
        } else {
            return infixLabel(arrow.arg1, '+', arrow.arg2);
        }
    },
    recompute: function(arrow) {
        arrow.at = add(arrow.arg1.at, arrow.arg2.at);
    },
    showProvenance: function(arrow, sheet) {
        sheet.drawLine(arrow.arg1.at, arrow.at);
    },
};

var mulOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: function(arrow) {
        if (arrow.arg1 === arrow.arg2) {
            return parenthesize(arrow.arg1.label) + '^2';
        } else {
            return infixLabel(arrow.arg1, '', arrow.arg2);
        }
    },
    recompute: function(arrow) {
        arrow.at = mul(arrow.arg1.at, arrow.arg2.at);
    },
    showProvenance: function(arrow, sheet) {
        sheet.drawSpiral(arrow.arg1.at, arrow.arg2.at, arrow.at);
    },
};

function infixLabel(arg1, opLabel, arg2) {
    var L = parenthesize(arg1.label);
    var R = parenthesize(arg2.label);
    return L + opLabel + R;
}

function parenthesize(name) {
    return name.length === 1 ? name : '(' + name + ')';
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

// XXX review the touch API, use clientX etc. instead?
function touchCoords(canvas, touch) {
    return canvasCoords(canvas, touch.pageX, touch.pageY);
}

function mouseCoords(canvas, event) {
    return canvasCoords(canvas, event.clientX, event.clientY);
}

function canvasCoords(canvas, pageX, pageY) {
    var canvasBounds = canvas.getBoundingClientRect();
    return {x: pageX - canvasBounds.left,
            y: pageY - canvasBounds.top};
}

function mouseHandler(canvas, handler) {
    return function(event) { handler(mouseCoords(canvas, event)); };
}

function leftButtonOnly(handler) {
    return function(event) {
        if (event.button === 0) { // left mouse button
            handler(event);
        }
    };
}

function assert(claim) {
    if (!claim) {
        throw new Error("Liar");
    }
}


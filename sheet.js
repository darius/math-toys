// A canvas UI to complex-number arithmetic.
// Let's call complex numbers 'arrows' here. ComplexNumber would be a mouthful.

;(function(exports) {

'use strict';

const cnum = mathtoys.complex;
const pointing = mathtoys.pointing;
const drawSpline = mathtoys.spline_interpolate.drawSpline;

const maxClickDistance = 2;
const minSelectionDistance = 20;
const dotRadius = 3;
const selectedDotRadius = 10;

// A quiver is a collection of arrows, with dependencies between some of them.
// The arrows can move, and can be added or removed from the collection.
// It's the 'model' with respect to the sheet UI.
function makeQuiver() {

    const arrows = [];
    const watchers = [];

    function isEmpty() {
        return 0 < arrows.length;
    }

    function getArrows() {
        return arrows;
    }

    function getFreeArrows() {
        return arrows.filter(arrow => arrow.op === variableOp);
    }

    function findLabel(label) {
        for (let arrow of arrows) {
            if (arrow.label === label) return arrow;
        }
        return null;
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

    // This assumes the arrows are from this quiver.
    function asFunction(inputArrow, outputArrow) {
        if (outputArrow.op === variableOp && inputArrow !== outputArrow) {
            const c = outputArrow.at;
            return z => c;
        } else {
            return z => {
                inputArrow.at = z;
                onMove();
                return outputArrow.at;
            }
        }

    }

    function onMove() {
        arrows.forEach(recompute);
        notify({tag: 'move'});
    }

    function notify(event) {
        watchers.forEach(watch => watch(event));
    }

    function recompute(arrow) {
        arrow.op.recompute(arrow);
    }

    const quiver = {
        add,
        addWatcher,
        asFunction,
        findLabel,
        isEmpty,
        getArrows,
        getFreeArrows,
        onMove,
    };
    return quiver;
}

// A sheet is a canvas displaying the complex-number plane.
function makeSheet(canvas, options) {
    options = override({center:   cnum.zero,
                        font:     '12pt Georgia',
                        realSpan: 8},
                       options);

    const ctx    = canvas.getContext('2d');
    const width  = canvas.width;   // N.B. it's best if these are even
    const height = canvas.height;
    const left   = -width/2;
    const right  =  width/2;
    const bottom = -height/2;
    const top    =  height/2;
    const scale  = width / options.realSpan;

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
        const x = at.re * scale + textOffset.x;
        const y = at.im * scale + textOffset.y;
        ctx.save();
        ctx.scale(1, -1); // Back into left-handed coordinates so the text isn't flipped
        ctx.fillText(text, x, -y);
        ctx.restore();
    }

    // Draw an arc from cnum u to uv (which should be u*v).
    function drawSpiral(u, v, uv) {
        const zs = computeSpiralArc(u, v, uv);
        const path = [];
        zs.forEach(z => {
            path.push(scale * z.re);
            path.push(scale * z.im);
        });
        drawSpline(ctx, path, 0.4, false);
    }

    function drawGrid() {
        let i, j;
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
        canvas,
        clear,
        ctx,
        drawDot,
        drawGrid,
        drawLine,
        drawSpiral,
        drawText,
        pointFromXY,
        scale,
        translate,
    };
}

// A sheet UI presents a quiver on a sheet, along with state
// and controls for seeing and manipulating the quiver.
function makeSheetUI(quiver, canvas, options, controls) {
    options = override({adding:      true,
                        multiplying: true,
                        preshow:     () => null,
                        showGrid:    true},
                       options);

    const sheet = makeSheet(canvas, options);

    const minSelectionD = minSelectionDistance / sheet.scale;
    const maxClickD     = maxClickDistance / sheet.scale;

    const selection = [];

    function show() {
        const ctx = sheet.ctx;
        ctx.save();
        sheet.clear();

        ctx.save();
        hand.dragGrid();
        if (options.showGrid) sheet.drawGrid();

        options.preshow();

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
        sheet.ctx.fillStyle = (arrow.pinned ? 'black' : arrow.op.color);
        sheet.drawDot(arrow.at, dotRadius);
        sheet.ctx.fillStyle = 'black';
        sheet.drawText(arrow.at, arrow.label, arrow.op.labelOffset);
    }

    function onStateChange() {
    }

    function isCandidatePick(at, arrow) {
        if (arrow.isScenery) return false;
        return cnum.distance(at, arrow.at) <= minSelectionD;
    }

    const zeroArrow = quiver.add(makeConstant(cnum.zero));
    const oneArrow  = quiver.add(makeConstant(cnum.one));
    quiver.add(makeConstant(cnum.neg(cnum.one)));

    const emptyHand = {
        moveFromStart: noOp,
        onMove: noOp,
        onEnd: noOp,
        dragGrid: noOp,
        show: noOp,
    };

    function onClick(at) {
        const choice = pickTarget(at, quiver.getArrows());
        if (choice !== null) {
            toggleSelection(choice);
        } else {
            const arrow = quiver.add({op: variableOp, at: at});
            renameFrom.value = arrow.label;
        }
    }

    // Select arrow unless already selected, in which case unselect it.
    function toggleSelection(arrow) {
        assert(0 <= selection.length && selection.length <= 1);
        if (arrow !== selection[0]) selection.splice(0, 1, arrow);
        else                        selection.splice(0, 1);
    }

    function pinSelection() {
        selection.forEach(arrow => {
            if (arrow.op !== constantOp) arrow.pinned = !arrow.pinned;
        })
    }

    function perform(op, at) {
        const target = pickTarget(at, quiver.getArrows());
        if (target !== null) {
            assert(0 <= selection.length && selection.length <= 1);
            selection.forEach((argument, i) => {
                selection[i] = quiver.add({op: op, arg1: argument, arg2: target});
            });
            assert(0 <= selection.length && selection.length <= 1);
            onStateChange();
        }
    }

    function pickTarget(at, arrows) {
        return pickClosestTo(at, arrows.filter(arrow => isCandidatePick(at, arrow)));
    }

    function pickClosestTo(at, candidates) {
        let result = null;
        candidates.forEach(arrow => {
            const d = cnum.distance(at, arrow.at);
            if (result === null || d < cnum.distance(at, result.at)) {
                result = arrow;
            }
        });
        return result;
    }

    function chooseHand(at) {
        const target = pickTarget(at, quiver.getFreeArrows());
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

    let hand = emptyHand;
    let handStartedAt;
    let strayed;

    addPointerListener(canvas, {
        onStart: xy => {
            handStartedAt = sheet.pointFromXY(xy);
            strayed = false;
            hand = chooseHand(handStartedAt);
            show();
        },
        onMove: xy => {
            if (handStartedAt === undefined) return;
            const at = sheet.pointFromXY(xy);
            strayed = strayed || maxClickD < cnum.distance(handStartedAt, at);
            hand.moveFromStart(cnum.sub(at, handStartedAt));
            hand.onMove();
            show();
        },
        onEnd: () => {
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
        pinSelection,
        sheet,
        show,
        toggleSelection,
    };
}

function makeConstant(value) {
    return {op: constantOp, at: value};
}

function addPointerListener(canvas, listener) {

    function onTouchstart(event) {
        event.preventDefault();     // to disable mouse events
        if (event.touches.length === 1) {
            listener.onStart(pointing.touchCoords(canvas, event.touches[0]));
        }
    }

    function onTouchmove(event) {
        if (event.touches.length === 1) {
            // XXX need to track by touch identifier rather than array index
            listener.onMove(pointing.touchCoords(canvas, event.touches[0]));
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

    canvas.addEventListener('mousedown', pointing.leftButtonOnly(pointing.mouseHandler(canvas, listener.onStart)));
    canvas.addEventListener('mousemove', pointing.mouseHandler(canvas, listener.onMove));
    canvas.addEventListener('mouseup',   pointing.mouseHandler(canvas, coords => {
        listener.onMove(coords);
        listener.onEnd();
    }));
}

const constantOp = {
    color: 'black',
    labelOffset: {x: -12, y: 6},
    label: arrow => {
        const z = arrow.at;
        if      (z.im === 0) return '' + z.re;
        else if (z.re === 0) return fmtImag(z.im);
        else                 return '' + z.re + '+' + fmtImag(z.im);
    },
    recompute: noOp,
    showProvenance: noOp,
};

function fmtImag(im) {
    let s = '';
    if (im !== 1) s += im;
    return s + 'i';
}

const variableOp = {
    color: 'green',
    labelOffset: {x: 6, y: -14},
    label: (arrow, quiver) => String.fromCharCode(97 + quiver.getFreeArrows().length),
    recompute: noOp,
    showProvenance: (arrow, sheet) => { // XXX fix the caller
        sheet.drawLine(cnum.zero, arrow.at);
        sheet.drawSpiral(cnum.one, arrow.at, arrow.at);
    },
};

function makeMoverHand(arrow, quiver) {
    const startAt = arrow.at;
    function moveFromStart(offset) {
        arrow.at = cnum.add(startAt, offset);
    }
    function onMove() {
        quiver.onMove();
    }
    return {
        moveFromStart,
        onMove,
        onEnd: onMove,     // TODO: add to the undo stack
        dragGrid: noOp,
        show: noOp,
    };
}

function makeAddHand(sheet, selection, perform) {
    let adding = cnum.zero;
    function moveFromStart(offset) {
        adding = offset;
    }
    function onEnd() {
        perform(addOp, adding);
    }
    return {
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid: () => sheet.translate(adding),
        show: () => {
            sheet.ctx.strokeStyle = 'magenta';
            sheet.drawLine(cnum.zero, adding);
            selection.forEach(arrow => {
                sheet.drawLine(arrow.at, cnum.add(arrow.at, adding));
            });
        }
    };
}

function makeMultiplyHand(sheet, selection, perform) {
    let multiplying = cnum.one;
    function moveFromStart(offset) {
        multiplying = cnum.add(cnum.one, offset);
    }
    function onEnd() {
        perform(mulOp, multiplying);
    }
    return {
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid: () => {
            sheet.ctx.transform(multiplying.re, multiplying.im, -multiplying.im, multiplying.re, 0, 0);
        },
        show: () => {
            sheet.ctx.strokeStyle = 'green';
            sheet.drawSpiral(cnum.one, multiplying, multiplying);
            selection.forEach(arrow => {
                sheet.drawSpiral(arrow.at, multiplying, cnum.mul(arrow.at, multiplying));
            });
        }
    };
}

const addOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: arrow => {
        if (arrow.arg1 === arrow.arg2) {
            return '2' + parenthesize(arrow.arg1.label);
        } else {
            return infixLabel(arrow.arg1, '+', arrow.arg2);
        }
    },
    recompute: arrow => {
        arrow.at = cnum.add(arrow.arg1.at, arrow.arg2.at);
    },
    showProvenance: (arrow, sheet) => {
        sheet.drawLine(arrow.arg1.at, arrow.at);
    },
};

const mulOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: arrow => {
        if (arrow.arg1 === arrow.arg2) {
            return parenthesize(arrow.arg1.label) + '^2';
        } else {
            return infixLabel(arrow.arg1, '', arrow.arg2);
        }
    },
    recompute: arrow => {
        arrow.at = cnum.mul(arrow.arg1.at, arrow.arg2.at);
    },
    showProvenance: (arrow, sheet) => {
        sheet.drawSpiral(arrow.arg1.at, arrow.arg2.at, arrow.at);
    },
};

function infixLabel(arg1, opLabel, arg2) {
    const L = parenthesize(arg1.label);
    const R = parenthesize(arg2.label);
    return L + opLabel + R;
}

function parenthesize(name) {
    return name.length === 1 ? name : `(${name})`;
}

// Return a sequence of points along an arc from cnum u to uv.
// Assuming uv = u*v, it should approximate a logarithmic spiral
// similar to one from 1 to v.
function computeSpiralArc(u, v, uv) {
    // Multiples of v^(1/8) as points on the spiral from 1 to v.
    const h4 = cnum.roughSqrt(v);
    const h2 = cnum.roughSqrt(h4);
    const h1 = cnum.roughSqrt(h2);
    const h3 = cnum.mul(h2, h1);
    const h5 = cnum.mul(h4, h1);
    const h6 = cnum.mul(h4, h2);
    const h7 = cnum.mul(h4, h3);

    return [u,
            cnum.mul(u, h1),
            cnum.mul(u, h2),
            cnum.mul(u, h3),
            cnum.mul(u, h4),
            cnum.mul(u, h5),
            cnum.mul(u, h6),
            cnum.mul(u, h7),
            uv];
}

function drawVectorField(sheet, f, vectorScale, spacing) {
    const ctx = sheet.ctx;
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.globalAlpha = 0.25;
    const height = sheet.canvas.height;
    const width  = sheet.canvas.width;
    for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
            const z = sheet.pointFromXY({x: x, y: y});
            drawStreamline(sheet, z, f, vectorScale);
        }
    }
    ctx.restore();
}

function drawStreamline(sheet, z, f, vectorScale) {
    const ctx = sheet.ctx;
    const scale = sheet.scale;
    const nsteps = 10;
    for (let i = 0; i < nsteps; ++i) {
        ctx.lineWidth = (nsteps-i) * 0.25;
        const dz = cnum.rmul(vectorScale/nsteps, f(z));
        if (1 && scale*0.03 < cnum.magnitude(dz)) {
            // We're going too far and might end up with random-looking
            // sharp-angled paths. Stop and let this streamline get
            // approximately filled in from some other starting point.
            break;
        }
        const z1 = cnum.add(z, dz);

        ctx.beginPath();
        ctx.moveTo(scale*z.re, scale*z.im);
        ctx.lineTo(scale*z1.re, scale*z1.im);
        ctx.stroke();

        z = z1;
    }
}

exports.mathtoys.sheet = {
    maxClickDistance: 2,
    minSelectionDistance: 20,
    dotRadius: 3,
    selectedDotRadius: 10,

    makeQuiver,
    makeSheet,
    makeSheetUI,
    constantOp,
    variableOp,
    addOp,
    mulOp,

    drawVectorField,
};
})(this);

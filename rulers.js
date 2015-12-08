// A canvas UI to complex-number arithmetic.
// Let's call complex numbers 'arrows' here. ComplexNumber would be a mouthful.

;(function(exports) {

'use strict';

const pointing = mathtoys.pointing;

const maxClickDistance = 2;
const minSelectionDistance = 20;
const dotRadius = 3;
const selectedDotRadius = 10;

// A quiver is a collection of arrows, with dependencies between some of them.
// The arrows can move, and can be added or removed from the collection.
// It's the 'model' with respect to the ruler UI.
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
        watchers.forEach(watch => watch(event));
    }

    function recompute(arrow) {
        arrow.op.recompute(arrow);
    }

    const quiver = {
        add,
        addWatcher,
        isEmpty,
        getArrows,
        getFreeArrows,
        onMove,
    };
    return quiver;
}

const tau = 2*Math.PI;

    function makeNumberLine(canvas, yPixels, options) {
        options = override({
            left: -10,
            right: 10,
        }, options);

        const ctx    = canvas.getContext('2d');
        const width = canvas.width;
        const height = 20;
        const scale = canvas.width / (options.right - options.left);

        function drawTicks() {
            let i, j;

            ctx.strokeStyle = 'grey';
            ctx.lineWidth = 1;
            for (i = options.left; i <= options.right; ++i) {
                for (j = 1; j <= 9; ++j) {
                    ctx.fillStyle = "gray";
                    ctx.fillRect(scale * (i + j / 10), yPixels, 2, 10);
                }

                ctx.fillStyle = "black";
                ctx.fillRect(scale * i, yPixels, 2, 15);
            }
        };

        function drawNumberLine() {
            ctx.strokeRect(-ctx.canvas.width / 2 - 1,
                           yPixels,
                           ctx.canvas.width + 2,
                           height);
        };

        function show() {
            ctx.save();
            ctx.translate(ctx.canvas.width / 2,
                          ctx.canvas.height / 2);
            drawNumberLine();
            drawTicks();
            ctx.restore();
        };

        return {
            show: show
        }
    };

// i'll change my indentation

// A ruler is a canvas displaying the complex-number plane.
function makeRulers(canvas, options) {
    options = override({center:   0,
                        font:     '12pt Georgia',
                        span:     8},
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

    if (options.center !== 0) {
        throw new Error("off-center ruler not supported yet");
    }

    function clear() {
        ctx.clearRect(left, bottom, width, height);
    }

    function drawDot(at, radius) {
        ctx.beginPath();
        ctx.arc(scale * at, 0, radius, 0, tau);
        ctx.fill();
    }

    function drawLine(at1, at2) {
        ctx.beginPath();
        ctx.moveTo(scale * at1, 0);
        ctx.lineTo(scale * at2, 0);
        ctx.stroke();
    }

    function drawLineXY(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    return {
        canvas,
        clear,
        ctx,
        drawDot,
        pointFromXY,
        scale,
    };
}

// A ruler UI presents a quiver on a ruler, along with state
// and controls for seeing and manipulating the quiver.
function makeRulerUI(quiver, canvas, options, controls) {
    options = override({adding:      true,
                        multiplying: true,
                        showGrid:    true},
                       options);

    const ruler = makeRuler(canvas, options);

    const minSelectionD = minSelectionDistance / ruler.scale;
    const maxClickD     = maxClickDistance / ruler.scale;

    const selection = [];

    function show() {
        const ctx = ruler.ctx;
        ctx.save();
        ruler.clear();

        ctx.save();
        hand.dragGrid();
        if (options.showGrid) ruler.drawGrid();
        ctx.fillStyle = 'red';
        selection.forEach(showArrowSelected);
        ctx.restore();

        hand.show();

        quiver.getArrows().forEach(showArrowAsMade);

        ctx.restore();
    }

    function showArrowAsMade(arrow) {
        arrow.op.showProvenance(arrow, ruler);
        showArrow(arrow);
    }

    function showArrowSelected(arrow) {
        ruler.drawDot(arrow.at, selectedDotRadius);
    }

    function showArrow(arrow) {
        ruler.ctx.fillStyle = arrow.op.color;
        ruler.drawDot(arrow.at, dotRadius);
        ruler.drawText(arrow.at, arrow.label, arrow.op.labelOffset);
    }

    function onStateChange() {
    }

    function isCandidatePick(at, arrow) {
        return cnum.distance(at, arrow.at) <= minSelectionD;
    }

    const zeroArrow = quiver.add({op: constantOp, at: cnum.zero});
    const oneArrow  = quiver.add({op: constantOp, at: cnum.one});

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
            quiver.add({op: variableOp, at: at});
        }
    }

    // Select arrow unless already selected, in which case unselect it.
    function toggleSelection(arrow) {
        assert(0 <= selection.length && selection.length <= 1);
        if (arrow !== selection[0]) selection.splice(0, 1, arrow);
        else                        selection.splice(0, 1);
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
            return makeAddHand(ruler, selection, perform);
        } else if (options.multiplying && isCandidatePick(at, oneArrow)) {
            return makeMultiplyHand(ruler, selection, perform);
        } else {
            return emptyHand;
        }
    }

    let hand = emptyHand;
    let handStartedAt;
    let strayed;

    addPointerListener(canvas, {
        onStart: xy => {
            handStartedAt = ruler.pointFromXY(xy);
            strayed = false;
            hand = chooseHand(handStartedAt);
            show();
        },
        onMove: xy => {
            if (handStartedAt === undefined) return;
            const at = ruler.pointFromXY(xy);
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
        show,
    };
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
    color: 'blue',
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
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label: (arrow, quiver) => String.fromCharCode(97 + quiver.getFreeArrows().length),
    recompute: noOp,
    showProvenance: (arrow, ruler) => { // XXX fix the caller
        ruler.drawLine(cnum.zero, arrow.at);
        ruler.drawSpiral(cnum.one, arrow.at, arrow.at);
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

function makeAddHand(ruler, selection, perform) {
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
        dragGrid: () => ruler.translate(adding),
        show: () => {
            ruler.ctx.strokeStyle = 'magenta';
            ruler.drawLine(cnum.zero, adding);
            selection.forEach(arrow => {
                ruler.drawLine(arrow.at, cnum.add(arrow.at, adding));
            });
        }
    };
}

function makeMultiplyHand(ruler, selection, perform) {
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
            ruler.ctx.transform(multiplying.re, multiplying.im, -multiplying.im, multiplying.re, 0, 0);
        },
        show: () => {
            ruler.ctx.strokeStyle = 'green';
            ruler.drawSpiral(cnum.one, multiplying, multiplying);
            selection.forEach(arrow => {
                ruler.drawSpiral(arrow.at, multiplying, cnum.mul(arrow.at, multiplying));
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
    showProvenance: (arrow, ruler) => {
        ruler.drawLine(arrow.arg1.at, arrow.at);
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
    showProvenance: (arrow, ruler) => {
        ruler.drawSpiral(arrow.arg1.at, arrow.arg2.at, arrow.at);
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

exports.mathtoys.ruler = {
    maxClickDistance: 2,
    minSelectionDistance: 20,
    dotRadius: 3,
    selectedDotRadius: 10,

    makeQuiver,
    makeNumberLine,
    makeRulerUI,
    constantOp,
    variableOp,
    addOp,
    mulOp,
};
})(this);

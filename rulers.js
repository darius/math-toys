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

const defaultFont = '12pt sans-serif';

function makeNumberLine(canvas, yPixels, options) {
    options = override({
        facing: 1,
        font:   defaultFont,
        labels: true,
        left:  -3,
        right:  6,
    }, options);

    assert(Math.abs(options.facing) === 1);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = 40;
    const scale = width / (options.right - options.left);

    function drawTicks() {
        ctx.lineWidth = 1;
        ctx.textBaseline = options.facing === 1 ? 'top' : 'bottom';
        for (let i = options.left; i <= options.right; ++i) { // XXX what about noninteger bounds?
            ctx.fillStyle = 'grey';
            for (let j = 1; j <= 9; ++j) {
                drawTick(i + j/10, 10);
            }
            ctx.fillStyle = 'black';
            drawTick(i, 15);
            if (options.labels) drawLabel(i, ''+i);
        }
    }

    function drawTick(x, h) {
        if (options.facing === 1) ctx.fillRect(scale * x, 0, 1, h);
        else                      ctx.fillRect(scale * x, height-h, 1, h);
    }

    function drawLabel(x, label) {
        const dy = options.facing === 1 ? 15 : height-15;
        ctx.fillText(label, scale * x, dy);
    }

    function drawNumberLine() {
        ctx.fillStyle = '#ed9';
        ctx.fillRect(scale * options.left, 0, width, height);
    }

    function show() {
        ctx.save();
        ctx.translate(width/2 - scale * (options.right + options.left) / 2,
                      canvas.height/2 + yPixels);
        ctx.font = options.font;
        ctx.textAlign = 'center';
        drawNumberLine();
        drawTicks();
        ctx.restore();
    }

    return {
        show,
    };
}

function makeNumberLineUI(canvas, options) {
    options = override({
        font:   defaultFont,
        labels: true,
        left:  -3,
        right:  6,
    }, options);

    const ctx = canvas.getContext('2d');
    const bot = makeNumberLine(canvas,  10, override({facing:  1}, options));
    const top = makeNumberLine(canvas, -50, override({facing: -1}, options));

    function show() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bot.show();
        top.show();
    }

//    let hand = emptyHand;
    let handStartedAt;
    let strayed;

    addPointerListener(canvas, {
        onStart: xy => {
            handStartedAt = xy;
            strayed = false;
//            hand = chooseHand(handStartedAt);
            show();
        },
        onMove: xy => {
            if (handStartedAt === undefined) return;
            strayed = strayed || maxClickDistance < distance(handStartedAt, xy);
//            hand.moveFromStart(cnum.sub(xy, handStartedAt));
//            hand.onMove();
            show();
        },
        onEnd: () => {
            assert(handStartedAt !== undefined);
            if (strayed) {
//                hand.onEnd();
            } else {
//                onClick(handStartedAt); // XXX or take from where it ends?
            }
//            hand = emptyHand;
            console.log('end', handStartedAt, strayed);
            show();
            handStartedAt = undefined;
        },
    });

    return {
        show,
    };
}

function distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
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

exports.mathtoys.ruler = {
    maxClickDistance: 2,
    minSelectionDistance: 20,
    dotRadius: 3,
    selectedDotRadius: 10,

    makeQuiver,
    makeNumberLine,
    makeNumberLineUI,

    constantOp,
    variableOp,
    addOp,
    mulOp,
};
})(this);

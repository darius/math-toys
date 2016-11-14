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

    let shift = 0;
    let stretch = 1;

    function show(arrows, selection, showText, shift_, stretch_) {
        shift = shift_ === void 0 ? 0 : -shift_; // XXX hacky -
        stretch = stretch_ === void 0 ? 1 : stretch_;

        ctx.save();
        ctx.translate(width/2 - scale * (shift + (options.right + options.left) / 2),
                      canvas.height/2 + yPixels);
        ctx.scale(stretch, 1);
        ctx.font = options.font;
        ctx.textAlign = 'center';
        const activeAt = (shift !== 0 ? 0 :
                          stretch_ !== void 0 ? 1 : null);
        drawNumberLine();
        drawTicks(activeAt);
        ctx.font = 'italic ' + options.font;
        arrows.forEach(drawArrow);
        ctx.restore();
        stretch = 1;
        shift = 0;

        function drawArrow(arrow) {
            if (selection.some(selected => selected === arrow)) {
                ctx.save();
                ctx.fillStyle = 'red';
                drawDot(arrow.at, selectedDotRadius);
                ctx.restore();
            }
            drawDot(arrow.at, dotRadius);
            if (showText) drawText(arrow.at, arrow.label);
        }
    }

    function drawNumberLine() {
        const left = Math.floor(options.left + shift);
        const right = Math.ceil(options.right + shift);
        ctx.fillStyle = '#ed9';
        ctx.fillRect(scale * left, 0,
                     scale * (right - left),
                     height);
    }

    function drawTicks(optActiveAt) {
        ctx.lineWidth = 1;
        ctx.textBaseline = options.facing === 1 ? 'top' : 'bottom';
        const left = Math.floor(options.left + shift);
        const right = Math.ceil(options.right + shift);
        for (let i = left; i <= right; ++i) {
            ctx.fillStyle = 'grey';
            if (i < right) {
                for (let j = 1; j <= 9; ++j) {
                    drawTick(i + j/10, 10);
                }
            }
            ctx.fillStyle = i === optActiveAt ? 'red' : 'black';
            drawTick(i, 15);
            if (options.labels) drawLabel(i, ''+i);
        }
    }

    function drawTick(x, h) {
        if (options.facing === 1) ctx.fillRect(scale * x, 0, 1, h);
        else                      ctx.fillRect(scale * x, height-h, 1, h);
    }

    function drawCursor(x) {
        ctx.save();
        ctx.translate(width/2,
                      canvas.height/2 + yPixels);
        ctx.fillStyle = 'red';
        const h = 30;           // XXX depends on higher-level layout
        if (options.facing === 1) ctx.fillRect(scale * x, -h, 1, h);
        else                      ctx.fillRect(scale * x, 40, 1, h);
        ctx.restore();
    }

    function drawLabel(x, label) {
        const dy = options.facing === 1 ? 15 : height-15;
        ctx.fillText(label, scale * x, dy);
    }

    function drawDot(at, radius) {
        const y = options.facing === 1 ? 0 : height;
        ctx.beginPath();
        ctx.arc(scale * at, y, radius, 0, tau);
        ctx.fill();
    }

    function drawText(at, text) {
        ctx.textBaseline = options.facing === 1 ? 'bottom' : 'top';
        const x = at * scale;
        const y = options.facing === 1 ? -dotRadius - 3 : height + dotRadius + 3;
        ctx.fillText(text, x, y);
    }

    function valueFromX(x) {
        return x / scale + options.left;
    }

    return {
        drawCursor,
        scale,
        show,
        valueFromX,
    };
}

function makeNumberLineUI(quiver, canvas, options) {
    options = override({
        font:   defaultFont,
        labels: true,
        left:  -3,
        right:  6,
    }, options);

    const ctx = canvas.getContext('2d');
    const bot = makeNumberLine(canvas,  15, override({facing:  1}, options));
    const top = makeNumberLine(canvas, -55, override({facing: -1}, options));

    const selection = [];

    function show() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const arrows = quiver.getArrows();
        hand.show(bot, top, arrows, selection);
    }

    const emptyHand = {
        moveFromStart: noOp,
        onMove: noOp,
        onEnd: noOp,
        dragGrid: noOp,
        show: (bot, top, arrows, selection) => {
            bot.show(arrows, selection, false);
            top.show(arrows, selection, true);
        },
    };

    function onClick(xy) {
        const value = bot.valueFromX(xy.x);
        const choice = pickTarget(value, quiver.getArrows());
        if (choice !== null) {
            toggleSelection(choice);
        } else {
            quiver.add({op: variableOp, at: value});
        }
    }

    // Select arrow unless already selected, in which case unselect it.
    function toggleSelection(arrow) {
        assert(0 <= selection.length && selection.length <= 1);
        if (arrow !== selection[0]) selection.splice(0, 1, arrow);
        else                        selection.splice(0, 1);
    }

    function pickTarget(value, arrows) {
        return pickClosestTo(value, arrows.filter(arrow => isCandidatePick(value, arrow)));
    }

    function isCandidatePick(value, arrow) {
        return bot.scale * Math.abs(value - arrow.at) <= minSelectionDistance;
    }

    function pickClosestTo(value, candidates) {
        let result = null;
        candidates.forEach(arrow => {
            const d = Math.abs(value - arrow.at);
            if (result === null || d < Math.abs(value - result.at)) {
                result = arrow;
            }
        });
        return result;
    }

    function chooseHand(xy) {
        const at = bot.valueFromX(xy.x);
        const target = pickTarget(at, quiver.getFreeArrows());
        if (target !== null) {
            return makeMoverHand(target, quiver, top);
        } else if (xy.y < canvas.height/2) { // XXX hack
            return makeAddHand(show, perform);
        } else {
            return makeMultiplyHand(show, perform);
        }
        return emptyHand; // XXX make the above tests pickier, so this could happen?
    }

    function perform(op, at) {
        at /= bot.scale; // XXX hack
        if (op === mulOp) at += 1; // XXX hack hack hack
        const target = pickTarget(at, quiver.getArrows());
        if (target !== null) {
            assert(0 <= selection.length && selection.length <= 1);
            selection.forEach((argument, i) => {
                selection[i] = quiver.add({op: op, arg1: argument, arg2: target});
            });
            assert(0 <= selection.length && selection.length <= 1);
        }
    }

    let hand = emptyHand;
    let handStartedAt;
    let strayed;

    addPointerListener(canvas, {
        onStart: xy => {
            handStartedAt = xy;
            strayed = false;
            hand = chooseHand(handStartedAt);
            show();
        },
        onMove: xy => {
            if (handStartedAt === undefined) return;
            strayed = strayed || maxClickDistance < distance(handStartedAt, xy);
            hand.moveFromStart(sub(xy, handStartedAt));
            hand.onMove();
            show();
        },
        onEnd: () => {
            assert(handStartedAt !== undefined);
            if (strayed) {
                hand.onEnd();
            } else {
                onClick(handStartedAt); // XXX or take from where it ends?
            }
            hand = emptyHand;
            handStartedAt = undefined;
            show();
        },
    });

    return {
        show,
    };
}

function makeMoverHand(arrow, quiver, ruler) {
    const startAt = arrow.at;
    function moveFromStart(offset) {
        arrow.at = startAt + offset.x / ruler.scale;
    }
    function onMove() {
        quiver.onMove();
    }
    return {
        moveFromStart,
        onMove,
        onEnd: onMove,
        dragGrid: noOp,
        show: (bot, top, arrows, selection) => {
            bot.show(arrows, selection, false);
            top.show(arrows, selection, true);
        },
    };
}

function makeAddHand(show, perform) {
    let adding = 0;
    function moveFromStart(offset) {
        adding = offset.x;
    }
    function onEnd() {
        perform(addOp, adding);
    }
    return {
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid: () => sheet.translate(adding),
        show: (bot, top, arrows, selection) => {
            bot.show(arrows, selection, false);
            top.show(arrows, selection, true, adding / bot.scale);
            if (adding !== 0) top.drawCursor(adding / bot.scale);
        },
    };
}

function makeMultiplyHand(show, perform) {
    let xOffset = 0;
    function moveFromStart(offset) {
        xOffset = offset.x;
    }
    function onEnd() {
        perform(mulOp, xOffset);
    }
    return {
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid: () => sheet.translate(multiplying),
        show: (bot, top, arrows, selection) => {
            const stretch = 1 + xOffset / top.scale;
            bot.show(arrows, selection, false, 0, stretch);
            bot.drawCursor(stretch);
            top.show(arrows, selection, true);
        },
    };
}

function distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function sub(p1, p2) {
    return {x: p1.x - p2.x,
            y: p1.y - p2.y};
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

const variableOp = {
    color: 'black',
//    labelOffset: {x: 6, y: -14},
    label: (arrow, quiver) => String.fromCharCode(97 + quiver.getFreeArrows().length),
    recompute: noOp,
    showProvenance: (arrow, ruler) => { // XXX fix the caller
//        ruler.drawLine(cnum.zero, arrow.at);
//        ruler.drawSpiral(cnum.one, arrow.at, arrow.at);
    },
};

const addOp = {
    color: 'black',
//    labelOffset: {x: 6, y: -14},
    label: arrow => {
        if (arrow.arg1 === arrow.arg2) {
            return '2' + parenthesize(arrow.arg1.label);
        } else {
            return infixLabel(arrow.arg1, '+', arrow.arg2);
        }
    },
    recompute: arrow => {
        arrow.at = arrow.arg1.at + arrow.arg2.at;
    },
    showProvenance: (arrow, ruler) => {
//        ruler.drawLine(arrow.arg1.at, arrow.at);
    },
};

const mulOp = {
    color: 'black',
//    labelOffset: {x: 6, y: -14},
    label: arrow => {
        if (arrow.arg1 === arrow.arg2) {
            return parenthesize(arrow.arg1.label) + '^2';
        } else {
            return infixLabel(arrow.arg1, '', arrow.arg2);
        }
    },
    recompute: arrow => {
        arrow.at = arrow.arg1.at * arrow.arg2.at;
    },
    showProvenance: (arrow, ruler) => {
//        ruler.drawSpiral(arrow.arg1.at, arrow.arg2.at, arrow.at);
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

    variableOp,
    addOp,
    mulOp,
};
})(this);

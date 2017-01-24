// A canvas UI to complex-number arithmetic.
// Let's call complex numbers 'arrows' here. ComplexNumber would be a mouthful.

;(function(exports) {

'use strict';

const cnum = mathtoys.complex;
const pointing = mathtoys.pointing;
const drawSpline = mathtoys.spline_interpolate.drawSpline;
const descent = mathtoys.descent;

const maxMergeDistance = 2;
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
        return arrows.filter(arrow => arrow.op !== constantOp);
    }

    function nameNextArrow() {
        const vars = arrows.filter(arrow => arrow.op === variableOp);
        return String.fromCharCode(97 + vars.length);
    }

    function findLabel(label) {
        for (const arrow of arrows) {
            if (arrow.label === label) return arrow;
        }
        return null;
    }

    function pinVariables(pinOn) {
        for (const arrow of arrows) {
            if (arrow.op === variableOp && !arrow.stayPinned) {
                pin(arrow, pinOn);
            }
        }
    }

    function pin(arrow, pinOn) {
        descent.pins[arrow.wires[0]] = pinOn;
        descent.pins[arrow.wires[1]] = pinOn;
    }

    function someConstrainedResult() {
        // TODO account for merged results... better
        for (const arrow of arrows) {
            if (0 < arrow.also.length || (arrow.op !== variableOp && arrow.stayPinned)) {
                return true;
            }
        }
        return false;
    }

    function add(arrow) {
        arrow.label = arrow.op.label(arrow, quiver);
        arrow.wires = arrow.op.makeConstraint(arrow);
        arrow.stayPinned = false; // TODO: simpler to make true for constantOp?
        arrow.merged = false;
        arrow.also = [];
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
        assert(inputArrow.op === constantOp || inputArrow.op === variableOp);
        const lines = [];
        for (let i = 0; ; ++i) {
            assert(i < arrows.length);
            const arrow = arrows[i];

            let re, im;
            if (arrow === inputArrow) {
                re = 'z.re';
                im = 'z.im';
            } else if (arrow.op === addOp) {
                const u = arrow.arg1._compiledAs;
                const v = arrow.arg2._compiledAs;
                re = 'r'+u+' + r'+v;
                im = 'i'+u+' + i'+v;
            } else if (arrow.op === mulOp) {
                const u = arrow.arg1._compiledAs;
                const v = arrow.arg2._compiledAs;
                re = 'r'+u+'*r'+v+' - i'+u+'*i'+v;
                im = 'i'+u+'*r'+v+' + r'+u+'*i'+v;
            } else {
                assert(arrow.op === constantOp || arrow.op === variableOp);
                re = '' + arrow.at.re; // XXX full precision?
                im = '' + arrow.at.im;
            }
            const L = lines.length;
            arrow._compiledAs = L;
            lines.push('const r'+L+' = '+re+', i'+L+' = '+im+';')

            if (arrows[i] === outputArrow) {
                lines.push('return {re: r'+L+', im: i'+L+'};');
                break;
            }
        }
        const sourceCode = 'z => {' + lines.join('\n') + '}';
        return (0,eval)(sourceCode);
    }

    // Update me to reflect any changes from dragging an arrow.
    function onMove() {
        notify({tag: 'move'});
    }

    function notify(event) {
        watchers.forEach(watch => watch(event));
    }

    // Update arrow's position, if it's a function of other arrows,
    // as that function of their current position.
    function recompute(arrow) {
        arrow.op.recompute(arrow);
    }

    function satisfy(nsteps) {
        descent.descend(nsteps);
        arrows.forEach(arrow => {
            arrow.at.re = descent.wires[arrow.wires[0]];
            arrow.at.im = descent.wires[arrow.wires[1]];
        });
    }

    // Return a list of equivalence classes: i.e. of lists of arrows
    // that are close enough to merge. The classes are disjoint, and
    // each has length >1.
    function listCoincidences() {
        const radius = 0.1; // XXX maxMergeDistance / sheet.scale, but we don't know sheet here
        const results = [];
        for (let i = 0; i < arrows.length; ++i) {
            const at_i = arrows[i].at;
            const equivs = [];
            for (let j = i+1; j < arrows.length; ++j) {
                const d = cnum.distance(at_i, arrows[j].at);
                if (d < radius) equivs.push(arrows[j]);
            }
            if (0 < equivs.length) {
                equivs.push(arrows[i]);
                results.push(equivs);
            }
        }
        return results;
    }

    function mergeCoincidences() {
        listCoincidences().forEach(merge);
    }

    // Change all of equivs to become one.
    // Pre: 0 < equivs.length
    function merge(equivs) {

        // Pick the representative.
        let repr = equivs[0];
        for (let i = 1; i < equivs.length; ++i) {
            const arrow = equivs[i];
            if (arrow.op === constantOp
                || (arrow.op === variableOp && repr.op !== constantOp)) {
                repr = arrow;
            }
        }

        // Substitute for it.
        const substs = new Map();
        for (const arrow of equivs) {
            if (arrow !== repr) {
                substs.set(arrow.wires[0], repr.wires[0]);
                substs.set(arrow.wires[1], repr.wires[1]);
                arrow.merged = true;
                repr.also.push(arrow);
                // TODO change arrow.op too? to something new?
                repr.label = repr.label + ' = ' + arrow.label;
            }
        }
        descent.substitute(substs);

        // Remove merged-out arrows from the quiver.
        let j = 0;
        while (j < arrows.length) {
            if (arrows[j].merged) arrows.splice(j, 1);
            else                  ++j;
        }

        // Notify
        // TODO make this a new event type?
    }

    const quiver = {
        add,
        addWatcher,
        asFunction,
        listCoincidences,
        findLabel,
        isEmpty,
        getArrows,
        getFreeArrows,
        mergeCoincidences,
        nameNextArrow,
        onMove,
        pin,
        pinVariables,
        satisfy,
        someConstrainedResult,
    };
    return quiver;
}

function unfuzzCanvas(canvas) {
    // From http://stackoverflow.com/questions/35820750/understanding-html-retina-canvas-support
    const ctx = canvas.getContext('2d');
    const bsRatio = (   ctx.backingStorePixelRatio
                     || ctx.webkitBackingStorePixelRatio
                     || ctx.mozBackingStorePixelRatio
                     || ctx.msBackingStorePixelRatio
                     || ctx.oBackingStorePixelRatio
                     || ctx.backingStorePixelRatio
                     || 1);
    const ratio = (window.devicePixelRatio || 1) / bsRatio;
    if (ratio !== 1) {
        canvas.style.width  = canvas.width  + 'px';
        canvas.style.height = canvas.height + 'px';
        canvas.width  *= ratio;
        canvas.height *= ratio;
        if (0) ctx.scale(ratio, ratio);
    }
    return ratio;
}

// A sheet is a canvas displaying the complex-number plane.
function makeSheet(canvas, options) {
    options = override({center:   cnum.zero,
                        font:     '12pt Georgia',
                        realSpan: 8},
                       options);
    const fuzzScale = unfuzzCanvas(canvas); // XXX make sure this only happens once

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
    const s_width  = parseInt(canvas.style.width  || canvas.width); //XXX strip 'px'
    const s_height = parseInt(canvas.style.height || canvas.height);
    const s_right  = s_width/2;
    const s_top    = s_height/2;
    const s_scale  = s_width / options.realSpan;
    function pointFromXY(xy) {
        return {re: (xy.x - s_right) / s_scale, im: (s_top - xy.y) / s_scale};
    }

    if (options.center.re !== 0 || options.center.im !== 0) {
        throw new Error("off-center sheet not supported yet");
    }

    function clear() {
        ctx.clearRect(left, bottom, width, height);
    }

    function drawDot(at, radius) {
        ctx.beginPath();
        ctx.arc(scale * at.re, scale * at.im, radius * fuzzScale, 0, tau);
        ctx.fill();
    }

    function drawCross(at) {
        const d = 12 * fuzzScale;
        ctx.beginPath();
        ctx.moveTo(scale * at.re - d, scale * at.im);
        ctx.lineTo(scale * at.re + d, scale * at.im);
        ctx.moveTo(scale * at.re, scale * at.im - d);
        ctx.lineTo(scale * at.re, scale * at.im + d);
        ctx.stroke();
    }

    function drawLine(at1, at2) {
        ctx.beginPath();
        ctx.moveTo(scale * at1.re, scale * at1.im);
        ctx.lineTo(scale * at2.re, scale * at2.im);
        ctx.stroke();
    }

    // N.B. textOffset is in canvas (xy) coordinates.
    function drawText(at, text, textOffset) {
        // XXX incorporate fuzzScale
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
        drawCross,
        drawGrid,
        drawLine,
        drawSpiral,
        drawText,
        fuzz: fuzzScale,
        pointFromXY,
        scale,
        translate,
    };
}

const emptyHand = {
    isDirty: () => false,
    moveFromStart: noOp,
    onMove: noOp,
    onEnd: () => emptyHand,
    dragGrid: noOp,
    show: noOp,
    ughXXX: () => false,
};

// A sheet UI presents a quiver on a sheet, along with state
// and controls for seeing and manipulating the quiver.
function makeSheetUI(quiver, canvas, options, controls) {
    options = override({adding:      true,
                        multiplying: true,
                        preshow:     () => null,
                        showGrid:    true},
                       options);

    const sheet = makeSheet(canvas, options);

    const minSelectionD = minSelectionDistance / (sheet.scale / sheet.fuzz);
    const maxClickD     = maxClickDistance / (sheet.scale / sheet.fuzz);

    const selection = [];

    let dirty = false;

    function heyImDirty() {
        if (!dirty) {
            dirty = true;
            requestAnimationFrame(redisplay);
        }
    }

    function redisplay() {
        if (dirty) {
            show();
            dirty = false;
            const e = descent.totalError();
            if (e <= 0.00001) {
                if (hand.isDirty()) {
                    requestAnimationFrame(redisplay);
                }
            } else {
                requestAnimationFrame(redisplay);
                quiver.satisfy(500);
                dirty = true;
            }
        } else if (hand.isDirty()) {
            show();
            requestAnimationFrame(redisplay);
        }
    }

    function show() {
        const ctx = sheet.ctx;
        ctx.save();
        sheet.clear();

        ctx.save();
        hand.dragGrid();
        if (options.showGrid) sheet.drawGrid();

        options.preshow();

        if (hand.ughXXX()) ctx.restore();
        ctx.fillStyle = 'red';
        selection.forEach(showArrowSelected);
        if (!hand.ughXXX()) ctx.restore();

        hand.show();

        const coincidenceGroups = quiver.listCoincidences();
        if (0 == coincidenceGroups.length) {
            mergeButton.disabled = true;  // XXX bad info hiding
        } else {
            mergeButton.disabled = false;  // XXX bad info hiding
            ctx.fillStyle = 'blue';
            for (const equivs of coincidenceGroups) {
                for (const arrow of equivs) {
                    sheet.drawDot(arrow.at, dotRadius*2);
                }
            }
        }

        quiver.getArrows().forEach(showArrowAsMade);

        ctx.restore();
    }

    function showArrowAsMade(arrow) {
        arrow.op.showProvenance(arrow, sheet);
        for (const merged of arrow.also) {
            merged.at = arrow.at;
            merged.op.showProvenance(merged, sheet);
        }
        showArrow(arrow);
    }

    function showArrowSelected(arrow) {
        sheet.drawDot(arrow.at, selectedDotRadius);
    }

    function showArrow(arrow) {
        sheet.ctx.fillStyle = (arrow.stayPinned ? 'black' : arrow.op.color);
        sheet.drawDot(arrow.at, dotRadius);
        if (arrow.stayPinned) sheet.drawCross(arrow.at);
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
            if (arrow.op !== constantOp) {
                arrow.stayPinned = !arrow.stayPinned;
                quiver.pin(arrow, arrow.stayPinned);
            }
        });
    }

    function perform(op, at) {
        const target = pickTarget(at, quiver.getArrows());
        if (target !== null) {
            assert(0 <= selection.length && selection.length <= 1);
            selection.forEach((argument, i) => {
                selection[i] = quiver.add({op: op, arg1: argument, arg2: target});
            });
            assert(0 <= selection.length && selection.length <= 1);
            quiver.pinVariables(true); // TODO pin *everything* old
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
            if (hand !== emptyHand) {
                hand.onEnd();
            }
            handStartedAt = sheet.pointFromXY(xy);
            strayed = false;
            hand = chooseHand(handStartedAt);
            heyImDirty();
        },
        onMove: xy => {
            if (handStartedAt === undefined) return;
            const at = sheet.pointFromXY(xy);
            strayed = strayed || maxClickD < cnum.distance(handStartedAt, at);
            hand.moveFromStart(cnum.sub(at, handStartedAt));
            hand.onMove();
            heyImDirty();
        },
        onEnd() {
            assert(handStartedAt !== undefined);
            hand = hand.onEnd();
            if (!strayed) {
                onClick(handStartedAt); // XXX or take from where it ends?
            }
            heyImDirty();
            handStartedAt = undefined;
        },
    });

    function merge() {
        quiver.mergeCoincidences();
        heyImDirty();
    }

    return {
        merge,
        pinSelection,
        sheet,
        show: heyImDirty,
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
    label(arrow) {
        const z = arrow.at;
        if      (z.im === 0) return '' + z.re;
        else if (z.re === 0) return fmtImag(z.im);
        else                 return '' + z.re + '+' + fmtImag(z.im);
    },
    recompute: noOp,
    makeConstraint(arrow) {
        return descent.makeComplexConstant(arrow.at);
    },
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
    label: (arrow, quiver) => quiver.nameNextArrow(),
    recompute: noOp,
    makeConstraint(arrow) {
        return descent.makeComplexConstant(arrow.at); // XXX not really constant
    },
    showProvenance(arrow, sheet) { // XXX fix the caller
        if (0) {
            sheet.drawLine(cnum.zero, arrow.at);
            sheet.drawSpiral(cnum.one, arrow.at, arrow.at);
        }
    },
};

function makeMoverHand(arrow, quiver) {
    const startAt = arrow.at;

    const pinEmAll = arrow.op === variableOp && !quiver.someConstrainedResult();
    quiver.pinVariables(pinEmAll);
    if (!pinEmAll) quiver.pin(arrow, true);

    function moveFromStart(offset) {
        arrow.at = cnum.add(startAt, offset);
        descent.wires[arrow.wires[0]] = arrow.at.re;
        descent.wires[arrow.wires[1]] = arrow.at.im;
    }
    function onMove() {
        quiver.onMove();
    }
    function onEnd() {
        quiver.pinVariables(!pinEmAll);
        if (!pinEmAll) quiver.pin(arrow, false);
        return emptyHand;
    }
    return {
        isDirty: () => false,
        moveFromStart,
        onMove,
        onEnd,
        dragGrid: noOp,
        show: noOp,
        ughXXX: () => false,
    };
}

function makeSnapDragBackHand(oldHand, path) {
    let step = path.length;
    function dragGrid() {
        // This is crude and side-effecty, but let's start here anyway.
        if (0 < step) {
            --step;
            oldHand.moveFromStart(path[step]);
            oldHand.dragGrid();
        }
    }
    return {
        isDirty: () => 0 < step,
        moveFromStart: noOp,
        onMove: noOp,
        onEnd: () => emptyHand,
        dragGrid,
        show: noOp, // oldHand.show,
        ughXXX: () => 0 < step,
    };
}


function makeAddHand(sheet, selection, perform) {
    let adding = cnum.zero;
    function moveFromStart(offset) {
        adding = offset;
    }
    function onEnd() {
        perform(addOp, adding);
        const path = [];
        for (let step = 0; step < 9; ++step) {
            path.push(cnum.rmul(step/9, adding));
        }
        return makeSnapDragBackHand(me, path);
    }
    const me = {
        isDirty: () => false,
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid() {
            sheet.translate(adding);
        },
        show() {
            sheet.ctx.strokeStyle = 'magenta';
            sheet.drawLine(cnum.zero, adding);
            selection.forEach(arrow => {
                sheet.drawLine(arrow.at, cnum.add(arrow.at, adding));
            });
        },
        ughXXX: () => false,
    };
    return me;
}

function makeMultiplyHand(sheet, selection, perform) {
    let multiplying = cnum.one;
    function moveFromStart(offset) {
        multiplying = cnum.add(cnum.one, offset);
    }
    function onEnd() {
        perform(mulOp, multiplying);
        // The snapback path. computeSpiralArc makes too many steps
        // for our animation, so we delete some to speed it up.
        const path = computeSpiralArc(cnum.one, multiplying, multiplying).map(z => cnum.sub(z, cnum.one));
        for (let step = path.length - 1; 0 < step; step -= 2) {
            path.splice(step - 1, 1);
        }
        return makeSnapDragBackHand(me, path);
    }
    const me = {
        isDirty() { return false; },
        moveFromStart,
        onMove: noOp,
        onEnd,
        dragGrid() {
            sheet.ctx.transform(multiplying.re, multiplying.im, -multiplying.im, multiplying.re, 0, 0);
        },
        show() {
            sheet.ctx.strokeStyle = 'green';
            sheet.drawSpiral(cnum.one, multiplying, multiplying);
            selection.forEach(arrow => {
                sheet.drawSpiral(arrow.at, multiplying, cnum.mul(arrow.at, multiplying));
            });
        },
        ughXXX: () => false,
    };
    return me;
}

const addOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label(arrow) {
        if (arrow.arg1 === arrow.arg2) {
            return '2' + parenthesize(arrow.arg1.label);
        } else {
            return infixLabel(arrow.arg1, '+', arrow.arg2);
        }
    },
    recompute(arrow) {
        arrow.at = cnum.add(arrow.arg1.at, arrow.arg2.at);
    },
    makeConstraint(arrow) {
        const value = cnum.add(arrow.arg1.at, arrow.arg2.at);
        const wires = [descent.genvar('+x', value.re),
                       descent.genvar('+y', value.im)];
        descent.complexAdd(arrow.arg1.wires, arrow.arg2.wires, wires);
        return wires;
    },
    showProvenance(arrow, sheet) {
        sheet.drawLine(arrow.arg1.at, arrow.at);
    },
};

const mulOp = {
    color: 'black',
    labelOffset: {x: 6, y: -14},
    label(arrow) {
        if (arrow.arg1 === arrow.arg2) {
            return parenthesize(arrow.arg1.label) + '^2';
        } else {
            return infixLabel(arrow.arg1, '', arrow.arg2);
        }
    },
    recompute(arrow) {
        arrow.at = cnum.mul(arrow.arg1.at, arrow.arg2.at);
    },
    makeConstraint(arrow) {
        const value = cnum.mul(arrow.arg1.at, arrow.arg2.at);
        const wires = [descent.genvar('*x', value.re),
                       descent.genvar('*y', value.im)];
        descent.complexMul(arrow.arg1.wires, arrow.arg2.wires, wires);
        return wires;
    },
    showProvenance(arrow, sheet) {
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
    // Multiples of v^(1/16) as points on the spiral from 1 to v.
    const h8 = cnum.roughSqrt(v);
    const h4 = cnum.roughSqrt(h8);
    const h2 = cnum.roughSqrt(h4);
    const h1 = cnum.roughSqrt(h2);

    const h3 = cnum.mul(h2, h1);

    const h5 = cnum.mul(h4, h1);
    const h6 = cnum.mul(h4, h2);
    const h7 = cnum.mul(h4, h3);

    const h9  = cnum.mul(h8, h1);
    const h10 = cnum.mul(h8, h2);
    const h11 = cnum.mul(h8, h3);
    const h12 = cnum.mul(h8, h4);
    const h13 = cnum.mul(h8, h5);
    const h14 = cnum.mul(h8, h6);
    const h15 = cnum.mul(h8, h7);

    return [u,
            cnum.mul(u, h1),
            cnum.mul(u, h2),
            cnum.mul(u, h3),
            cnum.mul(u, h4),
            cnum.mul(u, h5),
            cnum.mul(u, h6),
            cnum.mul(u, h7),
            cnum.mul(u, h8),
            cnum.mul(u, h9),
            cnum.mul(u, h10),
            cnum.mul(u, h11),
            cnum.mul(u, h12),
            cnum.mul(u, h13),
            cnum.mul(u, h14),
            cnum.mul(u, h15),
            uv];
}

function drawVectorField(sheet, f, vectorScale, spacing) {
    const ctx = sheet.ctx;
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    const height = sheet.canvas.height;
    const width  = sheet.canvas.width;
    for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
            const z = sheet.pointFromXY({x: x, y: y});
            sheet.drawDot(z, 1);
        }
    }
    ctx.globalAlpha = 0.5;
    for (let y = 0; y <= height; y += spacing) {
        for (let x = 0; x <= width; x += spacing) {
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
    ctx.beginPath();
    for (let i = 0; i < nsteps; ++i) {
        const dz = cnum.rmul(vectorScale/nsteps, f(z));
        if (1 && scale*0.03 < cnum.magnitude(dz)) {
            // We're going too far and might end up with random-looking
            // sharp-angled paths. Stop and let this streamline get
            // approximately filled in from some other starting point.
            break;
        }
        const z1 = cnum.add(z, dz);

        ctx.moveTo(scale*z.re, scale*z.im);
        ctx.lineTo(scale*z1.re, scale*z1.im);

        z = z1;
    }
    ctx.stroke();
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

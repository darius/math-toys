// Translate touch and mouse events to canvas-relative coords
// etc.

;(function(exports) {

'use strict';

// XXX review the touch API and see if this is right
function touchCoords(canvas, touch) {
    return canvasCoords(canvas, touch.clientX, touch.clientY);
}

function mouseCoords(canvas, event) {
    return canvasCoords(canvas, event.clientX, event.clientY);
}

function canvasCoords(canvas, pageX, pageY) {
    const canvasBounds = canvas.getBoundingClientRect();
    return {x: pageX - canvasBounds.left,
            y: pageY - canvasBounds.top};
}

function mouseHandler(canvas, handler) {
    return event => handler(mouseCoords(canvas, event));
}

function leftButtonOnly(handler) {
    return event => {
        if (event.button === 0) { // left mouse button
            handler(event);
        }
    };
}

if (exports.mathtoys === void 0) exports.mathtoys = {};
exports.mathtoys.pointing = {
    touchCoords,
    mouseCoords,
    //canvasCoords,
    mouseHandler,
    leftButtonOnly,
};
})(this);

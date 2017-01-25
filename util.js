'use strict';

const tau = 2*Math.PI;

function noOp() { }

function assert(claim) {
    if (!claim) {
        throw new Error("Liar");
    }
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
const override =
    (Object.assign ? Object.assign : (obj1, obj2) => {
        for (let k in obj2) {   // (can't use const yet in Firefox)
            if (({}).hasOwnProperty.call(obj2, k)) {
                obj1[k] = obj2[k];
            }
        }
        return obj1;
    });


// TODO wrap in own module, I guess:

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
        if (0) ctx.scale(ratio, ratio); // XXX I think it'd be cleaner
                                        // to enable this; but also
                                        // store the visible size
                                        // somewhere
    }
    return ratio;
}

function fuzzySize(canvas) { // XXX better name
    return {
        width: parseInt(canvas.style.width  || canvas.width), //XXX strip 'px'
        height: parseInt(canvas.style.height || canvas.height)
    };
}

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


// This is supposed to turn a number-string like '2' into a Unicode
// superscript suitable (in that case) to denote squaring. But afaict
// there are no fonts I can depend on having that support these
// superscripts. So I'm currently not using this; it sure would be
// convenient if I could.
function toSuperscript(str) {
    let s = '';
    for (let i = 0; i < str.length; ++i) {
        let c = str.charCodeAt(i);
        if (48 <= c && c < 58) c += 0x2070 - 48;
        else if (str[i] === '-') c = 0x207b;
        // TODO error on other characters?
        s += String.fromCharCode(c);
    }
    return s;
}


// TODO module for dom stuff?

function makeDomMaker(tag) {
    return (attrs, children) => {
        const element = document.createElement(tag);
        if (attrs !== void 0) for (const key of Object.keys(attrs)) {
            element[key] = attrs[key];
        }
        if (children !== void 0) for (const child of children) {
            element.appendChild(asDomElement(child));
        }
        return element;
    };
}

function asDomElement(x) {
    return typeof x === 'string' ? document.createTextNode(x) : x;
}

const HTML = {
    br:     makeDomMaker('br'),
    canvas: makeDomMaker('canvas'),
    div:    makeDomMaker('div'),
    input:  makeDomMaker('input'),
};


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

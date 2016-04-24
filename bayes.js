'use strict';

var grapher1, grapher2;

function onLoad() {
    grapher1 = makeGrapher(canvas1, 1);
    grapher2 = makeGrapher(canvas2, 1);
    hControl.addEventListener('input', update);
    eControl.addEventListener('input', update);
    e_hControl.addEventListener('input', update);
    update();
}

function update() {
    let e   = parseFloat(eControl.value / 100);
    let h   = parseFloat(hControl.value / 100);
    let e_h = parseFloat(e_hControl.value / 100);
    let h_e = e_h * h / e;
    console.log('e', e, 'h', h, 'e|h', e_h, 'h|e', h_e, 'h&e', e_h*h, h_e*e);
    redraw(e, h_e, h, e_h);
}

function redraw(e, h_e, h, e_h) {
    grapher1.ctx.save();
    grapher1.clear();
    grapher1.drawGrid();
    grapher1.drawLine({x: e, y: 0},   {x: 0, y: h});
    grapher1.drawLine({x: e_h, y: 0}, {x: 0, y: h_e});
    grapher1.ctx.restore();

    grapher2.ctx.save();
    grapher2.clear();
    grapher2.drawGrid();
    grapher2.drawLine({x: e, y: 0}, {x: 0, y: e_h});
    grapher2.drawLine({x: h, y: 0}, {x: 0, y: h_e});
    grapher2.ctx.restore();
}

function makeGrapher(canvas, widthSpan) {
    var ctx    = canvas.getContext('2d');
    var width  = canvas.width;   // N.B. it's best if these are even
    var height = canvas.height;
    var scale  = width / widthSpan;

    ctx.translate(width/2, height/2);
    ctx.scale(1, -1);
    ctx.translate(-width/2, -height/2);

    function clear() {
        ctx.clearRect(0, 0, width, height);
    }

    function drawGrid() {
        var i, j, x, y;
        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        for (i = 0; i * scale <= width; ++i) {
            ctx.globalAlpha = 0.25;
            for (j = 1; j <= 9; ++j) {
                x = (i+j/10) * scale;
                if (width < x) break;
                gridLine(x, 0, x, height);
            }
            ctx.globalAlpha = 1;
            gridLine(i * scale, 0, i * scale, height);
        }
        for (i = 0; i * scale <= height; ++i) {
            ctx.globalAlpha = 0.25;
            for (j = 1; j <= 9; ++j) {
                y = (i+j/10) * scale;
                if (height < y) break;
                gridLine(0, y, width, y);
            }
            ctx.globalAlpha = 1;
            gridLine(0, i * scale, width, i * scale);
        }
    }

    function gridLine(x0, y0, x1, y1) {
        drawLineXY(x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5); // + 0.5 for sharp grid lines
    }

    function drawLineXY(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    function graph(f) {
        ctx.strokeStyle = 'green';
        ctx.beginPath();
        for (var cx = 0; cx < width; ++cx) {
            var x = cx / scale;
            var y = f(x);
            if (cx === 0) ctx.moveTo(cx, scale*y);
            else          ctx.lineTo(cx, scale*y);
        }
        ctx.stroke();
    }

    return {
        ctx: ctx,
        clear: clear,
        drawGrid: drawGrid,
        drawLine: (p0, p1) => {
//            console.log('line', p0.x, p0.y, p1.x, p1.y);
            drawLineXY(scale*p0.x, scale*p0.y, scale*p1.x, scale*p1.y);
        },
    };
}

/*
  Copyright 2010 by Robin W. Spencer

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You can find a copy of the GNU General Public License
    at http://www.gnu.org/licenses/.
*/

// Irrelevant code has been removed, and the remainder wrapped into a module.
// Also, a bunch more tweaks now. Could use further clarification/tuning.
// -- Darius Bacon
// TODO: should I instead use the top answer to
// http://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas

;(function(exports) {

'use strict';

function pushControlPoints(cp, x0, y0, x1, y1, x2, y2, t){
    //  x0,y0,x1,y1 are the coordinates of the end (knot) pts of this segment
    //  x2,y2 is the next knot -- not connected here but needed to calculate p2
    //  p1 is the control point calculated here, from x1 back toward x0.
    //  p2 is the next control point, calculated here and pushed to become the 
    //  next segment's p1. [XXX both p1 and p2 are pushed; I don't understand.]
    //  t is the 'tension' which controls how far the control points spread.
    
    //  Scaling factors: distances from this knot to the previous and following knots.
    const d01 = Math.hypot(x1-x0, y1-y0);
    const d12 = Math.hypot(x2-x1, y2-y1);
   
    const fa = t * d01/(d01+d12);
    const fb = t - fa;
  
    const p1x = x1 + fa*(x0-x2);
    const p1y = y1 + fa*(y0-y2);

    const p2x = x1 - fb*(x0-x2);
    const p2y = y1 - fb*(y0-y2);  
    
    cp.push(p1x);
    cp.push(p1y);
    cp.push(p2x);
    cp.push(p2y);
}

function drawSpline(ctx, pts, t, closed){
    const cp = [];   // array of control points, as x0,y0,x1,y1,...
    const n = pts.length;

    if (closed){
        //   Append and prepend knots and control points to close the curve
        pts.push(pts[0], pts[1], pts[2], pts[3]);
        pts.unshift(pts[n-1]);
        pts.unshift(pts[n-1]);
        for (let i = 0; i < n; i += 2){
            pushControlPoints(cp, pts[i], pts[i+1], pts[i+2], pts[i+3], pts[i+4], pts[i+5], t);
        }
        cp = cp.concat(cp[0], cp[1]);   
        for (let i = 2; i < n+2; i += 2){
            ctx.beginPath();
            ctx.moveTo(pts[i], pts[i+1]);
            ctx.bezierCurveTo(cp[2*i-2], cp[2*i-1], cp[2*i], cp[2*i+1], pts[i+2], pts[i+3]);
            ctx.stroke();
            ctx.closePath();
        }
    } else {
        // Draw an open curve, not connected at the ends
        for (let i = 0; i < n-4; i += 2) {
            pushControlPoints(cp, pts[i], pts[i+1], pts[i+2], pts[i+3], pts[i+4], pts[i+5], t);
        }    
        ctx.beginPath();

        //  For open curves the first and last arcs are simple quadratics.
        ctx.moveTo(pts[0], pts[1]);
        ctx.quadraticCurveTo(cp[0], cp[1], pts[2], pts[3]);

        for (let i = 2; i < n-5; i += 2) {
            ctx.bezierCurveTo(cp[2*i-2], cp[2*i-1], cp[2*i], cp[2*i+1], pts[i+2], pts[i+3]);
        }
        
        ctx.moveTo(pts[n-2], pts[n-1]);
        ctx.quadraticCurveTo(cp[2*n-10], cp[2*n-9], pts[n-4], pts[n-3]);

        ctx.stroke();
    }
}

if (exports.mathtoys === void 0) exports.mathtoys = {};
exports.mathtoys.spline_interpolate = {
    drawSpline,
};
})(this);

<!DOCTYPE html>
<head>
  <meta http-equiv="Content-Type" content="text/html;charset=utf-8">
  <meta http-equiv="encoding" content="utf-8">
  <script type="text/javascript" src="spline_interpolate.js"></script>
  <script type="text/javascript" src="util.js"></script>
  <script type="text/javascript" src="pointing.js"></script>
  <script type="text/javascript" src="complex.js"></script>
  <script type="text/javascript" src="sheet.js"></script>
  <script type="text/javascript" src="draft.js"></script>
</head>

# What's a number?

*Complex numbers are neat*, and I want to show you what I know of
why. We'll start with a look at more familiar kinds of numbers from an
angle meant to reveal the newer sorts as comfortable instead of
'imaginary' or 'complex'. These fancier numbers have uses, a few of
which I hope to get to, but the use isn't the point of this essay;
instead I'd like to share what it's like to understand pretty
mathematics by playing with it instead of jamming it into your head in
school.

So, numbers. We all know the counting numbers: 1, 2, 3, ...  XXX
something about Alex the Parrot counting? Or crows counting hunters?
Etc. Counting tracks the size of a set of objects considered
interchangeable. Adding two numbers gives the size from combining the
sets. Multiplying means repeated adding. You can picture it with rows
and columns.

A number then can be seen as a noun or a verb: a property of a set, or
an action -- adding or multiplying.

You can add or multiply much faster than you could count out the
answer directly, by taking advantage of some facts:

                                   1 × a = a
    a + b = b + a                  a × b = b × a
    a + (b + c) = (a + b) + c      a × (b × c) = (a × b) × c
    
                 a × (b + c) = a × b + a × c

Like,

    252 + 78 = 200 + 50 + 2 + 70 + 8 
             = 200 + (50 + 70) + (2 + 8)
             = 200 + (100 + 20) + 10
             = (200 + 100) + (20 + 10)
             = 300 + 30
             = 330

We implicitly used the distributive law above: e.g. 20 + 10 is (2+1)
&times; 10. That is, our notation for numbers is designed around these
laws.

With the same laws we can solve other kinds of problems. (example of
algebra)

But there are many problems we can't solve: 2n = 1 has no solution.
Neither does n + 2 = 1.

We can try to invent a class of numbers that does include a
solution. These 'numbers' can't be interpreted as the size of a set
anymore, in general; they earn the name of 'number' by following the
same rules we've been using. These new-model numbers, considered as
nouns, are like marks on an endless ruler. To add them, you slide the
ruler. To multiply, you stretch it --- it's a magic elastic ruler that
grows (or shrinks) by the same amount everywhere along its
length. There's a special mark, 0, where

     0 + a = a
     0 × a = 0

Our old numbers correspond to evenly-spaced points along the right
half of the ruler. We need to check that they still behave...



  <canvas id="canvas" width="300" height="300"
          style="background-color: #eee"
          >
  </canvas>

  <script type="text/javascript">
    var canvas = document.getElementById("canvas");
    document.body.onload = onLoad;
  </script>

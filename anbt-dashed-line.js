/*
The MIT License

Copyright (c) 2009 sonota <yosiot8753@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
Sample HTML code:

<canvas id="canvas" width="400px" height="400px" />

<script type="text/javascript" src="anbt-dashed-line.js"></script>
<script type="text/javascript">
<!--
var cv = document.getElementById("canvas");
var ctx = cv.getContext("2d");

var lineStyle = {
  color: "#a00"
, pattern: "*****-"
, scale: 200
, width: 10
, cap: "butt" // butt, round, square
, join: "bevel" // round, bevel, miter
};

var vertices = [
  [  0,  0]
, [100,200]
, [110,150]
, [200,300]
];

var adl = new AnbtDashedLine();
adl.drawDashedPolyLine(ctx, vertices, lineStyle);
-->
</script>
*/


var AnbtDashedLine = function(){};


AnbtDashedLine.prototype = {
  defaultLineStyle: {
    pattern: "*-"
    , color: "#000"
    , width: 1
    , scale: 10
    , join:  "bevel"
    , cap:   "butt"
  }


  ,
  prepareLineStyle: function(lineStyle){
    if( lineStyle == null ){
      return this.defaultLineStyle;
    }

    if( lineStyle.pattern == undefined || lineStyle.pattern == null ){
      lineStyle.pattern = this.defaultLineStyle.pattern;
    }
    if( lineStyle.scale == undefined || lineStyle.scale == null ){
      lineStyle.scale = this.defaultLineStyle.scale;
    }
    if( lineStyle.color == undefined || lineStyle.color == null ){
      lineStyle.color = this.defaultLineStyle.color;
    }
    if( lineStyle.width == undefined || lineStyle.width == null ){
      lineStyle.width = this.defaultLineStyle.width;
    }
    if( lineStyle.cap == undefined || lineStyle.cap == null ){
      lineStyle.cap = this.defaultLineStyle.cap;
    }
    if( lineStyle.join == undefined || lineStyle.join == null ){
      lineStyle.join = this.defaultLineStyle.join;
    }

    return lineStyle;
  }


  ,
  distance: function(start, end){
    var x0 = start[0]
    , y0 = start[1]
    , x1 = end[0]
    , y1 = end[1];
    return Math.sqrt( Math.pow( x1 - x0, 2 ) + Math.pow( y1 - y0, 2 ) );
  }


  ,
  firstPattern: function(pattern, startPosition){
    /* start                         startPosition   end
     * |                             |               |
     * *******-----***********--------------*******---
     * 
     * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ => pattern[a]["length"]
     * ^^^^^^^^^^^^^^^^^^^^^^^                         => counted
     *                        ^^^^^^^^                 => startPosition - counted
     *                        ^^^^^^^^^^^^^^           => pattern[a]["length"]
     *                                ^^^^^^           => pattern[a]["length"] - ( startPosition - counted )
     *                                ------*******--- => newPattern
     * */

    if(startPosition >= 1){
      return pattern;
    }

    var counted = 0;
    var newPattern = [];
    for(var a=0, lim=pattern.length; a<lim; a++){
      if( counted + pattern[a].length > startPosition ){
        if(newPattern.length == 0){
          newPattern.push( { "type": pattern[a].type,
                             "length": pattern[a].length - ( startPosition - counted )
                           } );
        }else{
          newPattern.push( pattern[a] );
        }
      }
      counted += pattern[a].length;
    }

    return newPattern;
  }


  ,
  strToPattern: function(str){
    var chars = str.split("");

    var prev = null;
    var pattern = [];

    for(var a=0, lim=chars.length; a<lim; a++){
      var c = chars[a];
      if( c == prev ){
        pattern[pattern.length-1]["length"]++;
      }else{
        if(c == "*"){
          pattern.push({ "type": "line", "length": 1 });
        }else{
          pattern.push({ "type": "space", "length": 1 });
        }
      }
      prev = chars[a];
    }
    
    for(var a=0, lim=pattern.length; a<lim; a++){
      pattern[a]["length"] = pattern[a]["length"] / chars.length;
    }
    
    return pattern;
  }


  ,
  drawPolyLine: function(ctx, points, lineStyle){
    ctx.save();

    ctx.strokeStyle = lineStyle.color;
    ctx.lineWidth   = lineStyle.width;
    ctx.lineCap     = lineStyle.cap;
    ctx.lineJoin    = lineStyle.join;

    ctx.beginPath();

    ctx.moveTo( points[0][0], points[0][1] );
    for(var a=0, lim=points.length; a<lim; a++){
      ctx.lineTo( points[a][0], points[a][1] );
    }

    ctx.stroke();

    ctx.restore();
  }


  // return list of [start coordinate, end coordinate]
  ,
  dashedLine: function(start, end, lineStyle, startPosition){
    if(startPosition == undefined){
      startPosition = 0;
    }

    var pattern = this.strToPattern( lineStyle.pattern );
    var length = this.distance(start, end);

    // increment per unit(1px length line)
    var dx = (end[0] - start[0]) / length;
    var dy = (end[1] - start[1]) / length;

    var x = start[0];
    var y = start[1];

    var count = 0;
    var stroked = null;
    var overEnd = false;
    var workPattern;
    var result = [];

    line_end:
    while(true){
      if(count == 0){
        stroked = startPosition;
      }else{
        stroked = 0;
      }

      if(count == 0){
        workPattern = this.firstPattern(pattern, startPosition);
        if(workPattern.length == 0){
          workPattern = pattern;
        }
      }else{
        workPattern = pattern;
      }

      for(var a=0, lim=workPattern.length; a<lim; a++){

        // actual
        var adx = dx * workPattern[a]["length"] * lineStyle.scale;
        var ady = dy * workPattern[a]["length"] * lineStyle.scale;

        if(
          (count > 10000) // for safety
          || (              dx > 0 && x + adx >= end[0] )
            || ( dy == 0 && dx > 0 && x + adx >= end[0] )
            || (            dx < 0 && x + adx <= end[0] )
            || ( dy == 0 && dx < 0 && x + adx <= end[0] )
            || (            dy > 0 && y + ady >= end[1] )
            || ( dx == 0 && dy > 0 && y + ady >= end[1] )
            || (            dy < 0 && y + ady <= end[1] )
            || ( dx == 0 && dy < 0 && y + ady <= end[1] )
        ){
          overEnd = true;
        }

        if(overEnd){
          adx = end[0] - x;
          ady = end[1] - y;
          startPosition = stroked + this.distance([x,y], end) / lineStyle.scale;
        }

        if (workPattern[a]["type"] == "line"){
          result.push( [[x, y], [x + adx, y + ady]] );
        }

        if(overEnd){ break line_end; }

        x += adx;
        y += ady;
        stroked += workPattern[a].length;

        count++;
      }
    }

    return {
      startPosition: startPosition
      , lines: result
    };
  }


  ,
  drawLineFragments: function(ctx, dashedLines, lineStyle){
    for(var a = 0; a < dashedLines.length; a++){
      this.drawPolyLine( ctx
                         , dashedLines[a]
                         , lineStyle
                       );
    }
  }


  ,
  connectAdjacentLines: function(lineFragments, nextFragments){
    var lastVerticesLength = lineFragments[lineFragments.length-1].length;

    if(    lineFragments[lineFragments.length-1][lastVerticesLength-1][0] == nextFragments[0][0][0] // x
        && lineFragments[lineFragments.length-1][lastVerticesLength-1][1] == nextFragments[0][0][1] // y
      ){
        lineFragments[lineFragments.length-1].push( nextFragments[0][1] );
        nextFragments.shift();
      }
  }


  ,
  dashedPolyLine: function(vertices, lineStyle){
    var startPosition = 0;
    var lineFragments = [];
    var size = null;

    var returnValue = null;
    var vertexLnegth = null;

    for(var a=0, lim=vertices.length-1; a<lim; a++){
      returnValue = this.dashedLine(
        vertices[a]
        , vertices[a+1]
        , lineStyle
        , startPosition
      );
      
      startPosition = returnValue.startPosition;

      if( returnValue.lines.length > 0 ){
        if( lineFragments.length > 0 ){
          this.connectAdjacentLines(lineFragments, returnValue.lines);
        }

        for(var b=0, limB=returnValue.lines.length; b<limB; b++){
          lineFragments.push( returnValue.lines[b] );
        }
      }
    }

    return lineFragments;
  }


  ,
  drawDashedPolyLine: function(ctx, vertices, lineStyle){
    lineStyle = this.prepareLineStyle(lineStyle);
    var lineFragments = this.dashedPolyLine( vertices, lineStyle );
    this.drawLineFragments( ctx, lineFragments, lineStyle );
  }
};

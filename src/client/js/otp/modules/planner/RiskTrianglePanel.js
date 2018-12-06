/* This program is free software: you can redistribute it and/or
   modify it under the terms of the GNU Lesser General Public License
   as published by the Free Software Foundation, either version 3 of
   the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. 
*/

otp.namespace("otp.widgets");

otp.widgets.RiskTrianglePanel = new otp.Class({

    div         : null,
    barWidth    : 0,
    paths		: null,
    total		: 0,
    data 		: [25, 25, 25, 25],
    /*trianglequickFactor:    null,
    triangleflatFactor:   null,
    trianglesafeFactor:  null,*/

	height:    100,
    // default is even mixture 
    /*quickFactor : 0.333,
    flatFactor  : 0.333,
    safeFactor  : 0.334,*/

	TimeFactor : 0.25,
    SafetyFactor  : 0.25,
    FlexibilityFactor  : 0.25,
    CostFactor  : 0.25,

    onChanged   : null,
    
    quickBar    : null,
    flatBar     : null,
    safeBar     : null,
    costBar     : null,

    quickLabel  : null,
    flatLabel   : null,
    safeLabel   : null,
    costLabel   : null,
    
    cursorVert  : null,
    cursorHoriz : null,
    cursor      : null,
    
    //TRANSLATORS: Optimization for bicycle shown in bike triangle. Optimized
    //for speed
    quickName   : _tr("Time"),
    //TRANSLATORS: Optimization for bicycle shown in bike triangle. Optimized
    //for flat terrain
    flatName    : _tr("Flexibility"),
    //TRANSLATORS: Optimization for bicycle shown in bike triangle. Optimized
    //for bike friendly infrastructure. Cycle roads etc...
    safeName    : _tr("Safety"),
    costName    : _tr("Cost"),
    
    initialize : function(divID) {
    	console.log(divID)
        this.div = document.getElementById(divID);
        this.render();
    },
    
    render : function() {
    
        var this_ = this;
   
        var width = $(this.div).width();

        var margin = 10;
        //console.log()

        var r = Raphael($(this.div).attr('id'), width, this_.height);
        this.paths = r.set();
        var labelSize = "18px";
        var safeFill = "#bbe070"; 
        var safeFill2 = "#77b300"; 
        //TRANSLATORS: for safety
        var safeSym  = _tr("S"); 

        var flatFill = "#8cc4ff"; 
        var flatFill2 = "#61a7f2"; 
        //TRANSLATORS: For feasibility
        var flatSym  = _tr("F"); //locale.bikeTriangle.flatSym;
        
        var quickFill = "#ffb2b2";
        var quickFill2 = "#f27979";
        //TRANSLATORS: For Time
        var quickSym  = _tr("T"); //locale.riskTriangle.quickSym;
        
        var costFill = "#FFFF00"; 
        var costFill2 = "#FFA500"; 
        //TRANSLATORS: for safety
        var costSym  = _tr("C"); 
       /* var r = ["bb", "8c", "ff", "FF"];
        var g = ["e0", "c4", "b2", "FF"];
        var b = ["70", "ff", "b2", "00"];*/
        var colors = ["#ffb2b2", "#8cc4ff", "#bbe070", "#FFFF00"]; // T S F C
        //var colors = ["#bbe070", "#bbc470", "#bbb270", "#bbFF70"]; // T S F C
//        var labelT = r.text(height/4, height/4, quickSym);
//        labelT.attr({fill:quickFill2, "font-size":labelSize, "font-weight":"bold"});	
//
//        var labelH = r.text(height/2, height/4, flatSym);
//        labelH.attr({fill:flatFill2, "font-size":labelSize, "font-weight":"bold"});	
//
//        var labelS = r.text(height/4, height/2, safeSym);
//        labelS.attr({fill:safeFill2, "font-size":labelSize, "font-weight":"bold"});
//        
//        var labelC = r.text(height/2, height/2, costSym);
//        labelC.attr({fill:costFill2, "font-size":labelSize, "font-weight":"bold"}); 
        
        var barLeft = margin*5 + this_.height; 
        this.barWidth = width - this_.height;
        var barWidth = this.barWidth;
        var barHeight = (this_.height-margin*4)/4;

        this.quickBar = r.rect(barLeft, margin, barWidth*.25, barHeight);
        this.quickBar.attr({fill:quickFill, stroke:"none"});

        this.flatBar = r.rect(barLeft, margin*2+barHeight, barWidth*.25, barHeight);
        this.flatBar.attr({fill:flatFill, stroke:"none"});

        this.safeBar = r.rect(barLeft, margin*3 + barHeight*2, barWidth*.25, barHeight);
        this.safeBar.attr({fill:safeFill, stroke:"none"});
        
        this.costBar = r.rect(barLeft, margin*4 + barHeight*3, barWidth*.25, barHeight);
        this.costBar.attr({fill:costFill, stroke:"none"});

        this.quickLabel = r.text(barLeft, margin+barHeight/2, this.quickName + ": 25%");
        this.quickLabel.attr({"font-size":"12px", opacity:1});

        this.flatLabel = r.text(barLeft, margin*2+barHeight+barHeight/2,  this.flatName + ": 25%");
        this.flatLabel.attr({"font-size":"12px", opacity:1});

        this.safeLabel = r.text(barLeft, margin*3+barHeight*2+barHeight/2, this.safeName + ": 25%");
        this.safeLabel.attr({"font-size":"12px", opacity:1});
        
        this.costLabel = r.text(barLeft, margin*4+barHeight*3+barHeight/2, this.costName + ": 25%");
        this.costLabel.attr({"font-size":"12px", opacity:1});
        
        r.customAttributes.segment = function (x, y, r, a1, a2, index) {
            var flag = (a2 - a1) > 180, clr = (a2 - a1) / 360;
            a1 = (a1 % 360) * Math.PI / 180; 
            a2 = (a2 % 360) * Math.PI / 180;
            return {
                path: [["M", x, y], ["l", r * Math.cos(a1), r * Math.sin(a1)], ["A", r, r, 0, +flag, 1, x + r * Math.cos(a2), y + r * Math.sin(a2)], ["z"]],
              //  fill: "hsb(" + clr + ", .75, .8)"
               // fill: color
                fill: colors[index]
            };
        };
       // var labels = ["T", "F", "S", "C"]; 
       
        //var texts = [t1, t2, t3, t4];
        //console.log(texts);
        var this_ = this;
        var percentStore = [25, 25, 25, 25]
        function animate(ms) {
            var start = 0,
                val;
          //  var preX=height, preY=height/2, xTemp, yTemp;
            for (i = 0; i < ii; i++) {
                val = 360 / this_.total * this_.data[i];
                this_.paths[i].animate({segment: [this_.height/2, this_.height/2, 0.5*this_.height, start, start += val, i]}, ms || 1500, "bounce");
                this_.paths[i].angle = start - val / 2;
               // console.log(paths[i].angle);
                // console.log(this_.total); // the value will be used to calculate the percent
                // console.log(this_.data[i]);
                var percent = 100*this_.data[i]/this_.total;
                percent = Math.round(percent);
                var p = this_.data[i]/this_.total;
                percentStore[i] = percent;
                if (i==0) {
                	this_.quickBar.attr({width: barWidth*p}); // time
                	this_.quickLabel.attr("text", this_.quickName + ": "+percent+"%");
                	this_.TimeFactor = percent/100;
                } else {
                	if (i==1) {
                		this_.flatBar.attr({width: barWidth*p}); // flexibility
                		this_.flatLabel.attr("text", this_.flatName + ": " +percent+"%");
                		this_.FlexibilityFactor = percent/100;
                	} else {
                		if (i==2) {
                			this_.safeBar.attr({width: barWidth*p}); // safety
                			this_.safeLabel.attr("text", this_.safeName + ": " +percent+"%");
                			this_.SafetyFactor = percent/100;
                		} else {
                			// to make the sum equal to 100 always
                			var sum = percentStore[0]+percentStore[1]+percentStore[2]+percentStore[3];
                			// console.log(sum);
                			if (sum>100)
                				percentStore[3] -= sum-100;
                			if (sum < 100)
                				percentStore[3] += 100-sum;
                			this_.costBar.attr({width: barWidth*p}); // cost
                			this_.costLabel.attr("text", this_.costName + ": " +percentStore[3]+"%");
                			this_.CostFactor = percentStore[3]/100;
                		}
                	}
                }
                
                
                if(this_.onChanged && typeof(this_.onChanged) === "function") {
                	//console.log(this_.onChanged);
                    this_.onChanged();
                }
               // console.log(x1);
               // console.log(y1);
            /*	xTemp = height/2 + 0.5*height * Math.cos(start);
            	yTemp = height/2 + 0.5*height * Math.sin(start);
            	x1 = (xTemp-preX)/2;
            	y1 = (yTemp - preY)/2;
            	preX = xTemp;
            	preY = yTemp;
                	// x1 = height/2+ 0.5*height/2*Math.cos(paths[i].angle);
                    // y1 = height/2- 0.5*height/2*Math.sin(paths[i].angle);
                if (i==0) {
                	t1.animate({x:x1, y:y1}, ms);
            	}
                if (i==1) {
                	//x1 = height/2- 0.5*height/2*Math.cos(paths[i].angle);
                    //y1 = height/2- 0.5*height/2*Math.sin(paths[i].angle);
                	t2.animate({x:x1, y:y1}, ms);
                }
                if (i==2) {
                	//x1 = height/2- 0.5*height/2*Math.cos(paths[i].angle);
                    //y1 = height/2+ 0.5*height/2*Math.sin(paths[i].angle);
                	t3.animate({x:x1, y:y1}, ms);
                }
                if (i==3) {
                	//x1 = height/2+ 0.5*height/2*Math.cos(paths[i].angle);
                    //y1 = height/2+ 0.5*height/2*Math.sin(paths[i].angle);
                	t4.animate({x:x1, y:y1}, ms);
                } */
            }
        }
       // var data = [25, 25, 25, 25],
         //   paths = r.set(),
        var   start,
            bg = r.circle(this_.height/2, this_.height/2, 0).attr({stroke: "#fff", "stroke-width": 4});
        this_.data = this_.data.sort(function (a, b) { return b - a;});

        // total = 0;
        for (var i = 0, ii = this_.data.length; i < ii; i++) {
        	this_.total += this_.data[i];
        }
        start = 0;
        for (i = 0; i < ii; i++) {
            var val = 360 / this_.total * this_.data[i];
            (function (i, val) {
            	this_.paths.push(r.path().attr({segment: [this_.height/2, this_.height/2, 1, start, start + val, 0], stroke: "#fff"}).click(function () {
                	this_.total += this_.data[i];
                	this_.data[i] *= 2;
                    animate();
                }));
            })(i, val);
            start += val;
        }
        
     /*   var t1 = r.text(75, 75, "T").attr({font: '100 15px "Helvetica Neue", Helvetica, "Arial Unicode MS", Arial, sans-serif', fill: "#000"});
        var t2 = r.text(75, 25, "F").attr({font: '100 15px "Helvetica Neue", Helvetica, "Arial Unicode MS", Arial, sans-serif', fill: "#000"});
        var t3 = r.text(25, 75, "S").attr({font: '100 15px "Helvetica Neue", Helvetica, "Arial Unicode MS", Arial, sans-serif', fill: "#000"});
        var t4 = r.text(25, 25, "C").attr({font: '100 15px "Helvetica Neue", Helvetica, "Arial Unicode MS", Arial, sans-serif', fill: "#000"}); */
        bg.animate({r: this_.height/2}, 1000, "bounce");
        animate(1000);
        var opacityAnimation = Raphael.animation({opacity: .65}, 1000);
        this_.quickBar.animate(opacityAnimation);
        this_.flatBar.animateWith(this_.quickBar, opacityAnimation, opacityAnimation);
        this_.safeBar.animateWith(this_.quickBar, opacityAnimation, opacityAnimation);
        this_.costBar.animateWith(this_.quickBar, opacityAnimation, opacityAnimation);
        // var t = r.text(height/2, 20, "Click on segments to make them bigger.").attr({font: '100 15px "Helvetica Neue", Helvetica, "Arial Unicode MS", Arial, sans-serif', fill: "#000"});
        
        //Shuai (20-02-2018) fix the problem that sometimes triangle texts are not replaced in the right position
        //firefox dont need to make this change
        if(!(typeof InstallTrigger !== 'undefined')){
	        if (this.quickLabel.node.childNodes[0].attributes[0].name == "dy") {
	//        	console.log("quick lable");
	//        	console.log(this.quickLabel.node.childNodes[0].attributes[0].value);
	        	this.quickLabel.node.childNodes[0].attributes[0].value = 4.5;       
	//        	console.log(this.quickLabel.node.childNodes[0].attributes[0].value);
	          }
	        if (this.flatLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.flatLabel.node.childNodes[0].attributes[0].value = 4.5;  
	          }
	        if (this.safeLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.safeLabel.node.childNodes[0].attributes[0].value = 4.5;    
	          }
	        if (this.costLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.costLabel.node.childNodes[0].attributes[0].value = 4.5;     
	          }
        }
    },
    


    setValues : function(quick, flat, safe, cost) {
    	this.TimeFactor = quick;
        this.SafetyFactor = safe;
        this.FlexibilityFactor = flat;
        this.CostFactor = cost;
        
        this.quickBar.attr({width: this.barWidth*quick});
        this.flatBar.attr({width: this.barWidth*flat});
        this.safeBar.attr({width: this.barWidth*safe});
        this.costBar.attr({width: this.barWidth*cost});
        this.quickLabel.attr("text",   this.quickName + ": "+Math.round(quick*100)+"%");
        this.flatLabel.attr("text",   this.flatName + ": " +Math.round(flat*100)+"%");
        this.safeLabel.attr("text", this.safeName + ": " +Math.round(safe*100)+"%");
        this.costLabel.attr("text", this.costName + ": " +Math.round(cost*100)+"%");
        
        //Shuai (20-02-2018) fix the problem that sometimes triangle texts are not replaced in the right position
        //firefox dont need to make this change
        if(!(typeof InstallTrigger !== 'undefined')){
	        if (this.quickLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.quickLabel.node.childNodes[0].attributes[0].value = 4.5;       
	          }
	        if (this.flatLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.flatLabel.node.childNodes[0].attributes[0].value = 4.5;  
	          }
	        if (this.safeLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.safeLabel.node.childNodes[0].attributes[0].value = 4.5;    
	          }
	        if (this.costLabel.node.childNodes[0].attributes[0].name == "dy") {
	        	this.costLabel.node.childNodes[0].attributes[0].value = 4.5;     
	          }
        }

        // reset the pie chart
//        this.data = [25, 25, 25, 25];
        this.data=[quick, flat, safe, cost];
        
        var start = 0;
        this.total = 0;
        var h = this.height;
        for (var i = 0, ii = this.data.length; i < ii; i++) {
        	this.total += this.data[i];
        }
        for (i = 0; i < ii; i++) {
        	var val = 360 / this.total * this.data[i];
        	// console.log(val);
        	this.paths[i].animate({segment: [h/2, h/2, 0.5*h, start, start += val, i]}, 1000 || 1500, "bounce");
            // console.log(start);
        }
       // this.moveCursor(x, y);
    },

    /** NOTE: don't rename this stuff, as OTP api depends on these values */
    getFormData : function() {
        return {
                time_w				   : this.TimeFactor,
                safety_w			   : this.SafetyFactor,
                flexibility_w		   : this.FlexibilityFactor,
                cost_w		           : this.CostFactor
                /*co2_w				   : this.TimeFactor,
            time_w			       : this.SafetyFactor,
            distance_w			   : this.FlexibilityFactor*/
        }
    },
    
    CLASS_NAME: "otp.widgets.RiskTrianglePanel"

});


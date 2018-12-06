/**
 * 
 */
/*Yuanyuan 8/10/2017 Check the quality of the route according to KRIs*/
function checkQuality(itinerary) {
	var KRIs = itinerary.itinData.KRIs;
	var timeRating = KRIs.timeRating;
	var flexibility = 100-KRIs.flexibility*60*100/KRIs.duration;
	var safety = KRIs.safety;
	var costRating = KRIs.costRating;
	if (timeRating >= 90 && flexibility >= 90 && safety >= 90 && costRating >= 90)
		return 1;
	else {
		if (timeRating >= 70 && flexibility >= 70 && safety >= 70  && costRating >= 70)
			return 2;
		else
			return 3;
	}
}
	/*Yuanyuan 8/4/2017 Add the chart associated with the button to show risk*/
	// allocate space
function createChart(KRIs) {
		console.log(KRIs);
		var timeRating = KRIs.timeRating.toFixed(2);
		var upperTime = 100-KRIs.minTime*60*100/KRIs.duration;
		// convert a number into a string, keeping only two decimals
		var lowerTime = 100-KRIs.maxTime*60*100/KRIs.duration;
		var errorTime = KRIs.timeError;//(upperTime-lowerTime)/2;
		errorTime = errorTime.toFixed(2);
		var timeStd = KRIs.timeStd.toFixed(2);
		
		var costRating = KRIs.costRating.toFixed(2);
		var upperCost = 100-100*KRIs.minCost/KRIs.totalCost;
		var lowerCost = 100-100*KRIs.maxCost/KRIs.totalCost;
		var errorCost = KRIs.costError;//(upperCost-lowerCost)/2;
		errorCost = errorCost.toFixed(2);
		var costStd = 0;
		if (KRIs.costStd!=0)
			costStd = KRIs.costStd.toFixed(2);
		
		var flexibility = 100-KRIs.flexibility*60*100/KRIs.duration;
		var upperF = 100-KRIs.minFlexibility*60*100/KRIs.duration;
		var lowerF = 100-KRIs.maxFlexibility*60*100/KRIs.duration;	
		var errorF = KRIs.flexibilityError;//(upperF-lowerF)/2;
		console.log(upperF);
		console.log(lowerF);
		errorF = errorF.toFixed(2);
		var flexibilityStd = KRIs.flexibilityStd.toFixed(2);
		
		var safety = KRIs.safety;
		
		var upperAvg = (upperF + upperTime +safety + upperCost)/4;
		var lowerAvg = (lowerF + lowerTime +safety + lowerCost)/4;
		var errorAvg = (upperAvg - lowerAvg)/2;
		var avg = (flexibility + KRIs.timeRating +safety + KRIs.costRating)/4;
		avg = avg.toFixed(2);
		lowerAvg = lowerAvg.toFixed(2);
		upperAvg = upperAvg.toFixed(2);
		errorAvg = errorAvg.toFixed(2);
		lowerF =lowerF.toFixed(2);
		upperF = upperF.toFixed(2);
		flexibility = flexibility.toFixed(2);
		var maxF = "waiting time " +  KRIs.maxFlexibility + "min"
		var minF = "waiting time " +  KRIs.minFlexibility + "min"
		lowerTime = lowerTime.toFixed(2);
		upperTime = upperTime.toFixed(2);
		var lowerTimeDelay = "time delay " + KRIs.minTime + "min";
		var upperTimeDelay = "time delay " + KRIs.maxTime + "min";
		
		minCost = KRIs.minCost.toFixed(2);
		maxCost = KRIs.maxCost.toFixed(2);
		var lowerCostDev = "cost deviation " + minCost + "euros";
		var upperCostDev = "cost deviation " + maxCost + "euros";
		
		safety = safety.toFixed(2);
		
		// Mini plugin to force a zero minimum on the first value axis if all values
		// are non-negative. Can be extended to support multiple value axes if needed.
		AmCharts.addInitHandler(function(chart) {
			  //get all value fields if there are multiple graphs
			  var valueFields = chart.graphs.map(function(graph) {
			    return graph.valueField;
			  });
			  //find out if there are any values less than 60 in the dataProvider for any graph.
			 /* var containsNegatives = chart.dataProvider.some(function(dataItem) {
			    return valueFields.some(function(valueField) {
			      return dataItem[valueField] < 90;
			    });
			  }); */
			  // find out the smallest value
			  var temp = 90;
			  chart.dataProvider.some(function(dataItem) {
				  return valueFields.some(function(valueField) {
					  if(dataItem[valueField]<temp) {
						  temp = dataItem[valueField];
						  return temp;
					  }
				    });
				  }); 
			  //only set the value axis minimum to 60 if there are no smaller values.
			 // if (!containsNegatives) {
			    chart.valueAxes[0].minimum = temp-5;
			    chart.validateData();
			//  }
			  chart.valueAxes[0].maximum = 100;
			}, ['serial']);
		
		var chart = AmCharts.makeChart("chartContainer", {
			"hideCredits": true,
			"type": "serial",
			  "dataProvider": [{
			    "risk type": "Time reliability",
			    "value": timeRating,
			    "error": errorTime,
			    "std": timeStd,
			    "maximum": upperTimeDelay,
			    "minimum": lowerTimeDelay,
			    "color": "#ffb2b2",
			  }, {
				"risk type": "Safety",
			    "value": safety,
			    "error": 0,
			    "std": 0,
			    "maximum": safety,
			    "minimum": safety,
			    "color": "#bbe070",
			  }, {
				"risk type": "Cost Reliability",
			    "value": costRating,
			    "error": errorCost,
			    "std": costStd,
			    "maximum": upperCostDev,
			    "minimum": lowerCostDev,
			    "color": "#FFFF00",
			   },{
				"risk type": "Flexibility",
			    "value":  flexibility,
			    "error": errorF,
			    "std": flexibilityStd,
			    "maximum": maxF,
			    "minimum": minF,
			    "color": "#8cc4ff",
			  }/*, {
				"risk type": "Average risk rating",
			    "value": avg,
			    "error": errorAvg,
			    "maximum": upperAvg,
			    "minimum": lowerAvg
			  }*/],
			  "balloon": {
			    "textAlign": "left"
			  },
			  "valueAxes": [{
			    "id": "v1",
			    "includeGuidesInMinMax": true,
			    "axisAlpha": 0,
			    "precision": 2,
			    "baseValue": 0
			    // "minMaxMultiplier": 1
			  }],
			  "startDuration": 1,
			  "graphs": [{
			    "balloonText": "value(%):<b>[[value]]</b><br>error:<b>[[error]]</b><br>standard deviation:<b>[[std]]</b><br>max:<b>[[maximum]]</b><br>min:<b>[[minimum]]</b>",
			    "labelText": "[[value]]",
			    "type": "column",
			    "bullet": "yError",
			    "bulletColor": "#000",
			    "errorField": "error",
			    "lineThickness": 2,
			    "valueField": "value",
			    "bulletAxis": "v1",
			    "fillAlphas": 1,
			    "fillColorsField": "color",
			  }],
			  "chartCursor": {
			    "cursorAlpha": 0,
			    "cursorPosition": "mouse",
			    "graphBulletSize": 1,
			    "zoomable": false
			  },
			  "categoryField": "risk type",
			  "categoryAxis": {
			    "gridPosition": "start",
			    "axisAlpha": 0
			  }/*,
			  "guides": [
				  {
					  "fillAlpha": 0.10,
					  "value": 0,
					  "toValue": 100
				  } 
			  ] */
			  /*"listeners": [{
				  "event": "rendered",
				  "method": function(e) {
					  e.chart.valueAxes[0].zoomToValues(0, 100);
				  }
			  }]*/
		});
		createSide1Chart(avg, lowerAvg, upperAvg, errorAvg);
}
		
function createSide1Chart(avg, lowerAvg, upperAvg, errorAvg)	{
	var chart = AmCharts.makeChart("sideChart1",{
	"hideCredits": true,
	"type": "serial",
	"dataProvider": [{
	"risk type": "Average risk rating",
	"value": avg,
	"error": 0, // since standard error is a method if measurement of estimation
	// of standard deviation of sampling distribution, so no sense to display here I think
	"maximum": upperAvg,
	"minimum": lowerAvg
	  }],
	  "balloon": {
	"textAlign": "left"
	  },
	  "valueAxes": [{
	"id": "v1",
	"axisAlpha": 0,
	"precision": 2,
	"baseValue": 0,
	"minMaxMultiplier": 1
	// "unit": "%"
	  }],
	  "startDuration": 1,
	  "graphs": [{
	"balloonText": "value(%):<b>[[value]]</b><br>max:<b>[[maximum]]</b><br>min:<b>[[minimum]]</b>",
	"labelText": "[[value]]",
	"type": "column",
	//"bullet": "yError",
	//"bulletColor": "#000",
	// "errorField": "error",
	"lineThickness": 2,
	"valueField": "value",
	"bulletAxis": "v1",
	"fillAlphas": 1
	  }],
	  "chartCursor": {
	"cursorAlpha": 0,
	"cursorPosition": "mouse",
	"graphBulletSize": 1,
	"zoomable": false
	  },
	  "categoryField": "risk type",
	  "categoryAxis": {
	"gridPosition": "start",
	"axisAlpha": 0
	  },
	  "listeners": [{
		  "event": "rendered",
		  "method": function(e) {
			  e.chart.valueAxes[0].zoomToValues(0, 100);
		  }
	  }]
});
}
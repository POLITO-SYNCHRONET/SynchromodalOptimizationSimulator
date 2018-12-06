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

otp.widgets.ItinerariesWidget =
    otp.Class(otp.widgets.Widget, {

    module : null,

    itinsAccord : null,
    footer : null,

    itineraries : null,
    activeIndex : 0,

    // set to true by next/previous/etc. to indicate to only refresh the currently active itinerary
    refreshActiveOnly : false,
    showButtonRow : false,    //Shuai (22-03-2017) temporarily disable the buttonRow, waiting for decisions. 
    showItineraryLink : true,
    showPrintLink : true,
    showEmailLink : true,
    showSearchLink : false,


    initialize : function(id, module) {
        this.module = module;

        otp.widgets.Widget.prototype.initialize.call(this, id, module, {
            //TRANSLATORS: Widget title
            title : _tr("Itineraries"),
            cssClass : module.itinerariesWidgetCssClass || 'otp-defaultItinsWidget',
            resizable : true,
            closeable : true,
            persistOnClose : true
        });
        //this.$().addClass('otp-itinsWidget');
        //this.$().resizable();
        //this.minimizable = true;
        //this.addHeader("X Itineraries Returned");
    },

    activeItin : function() {
        return this.itineraries[this.activeIndex];
    },

    updatePlan : function(plan) {
        this.updateItineraries(plan.itineraries, plan.queryParams);
    },

    updateItineraries : function(itineraries, queryParams, itinIndex) {

        var this_ = this;
        var divId = this.id+"-itinsAccord";

        if(this.minimized) this.unminimize();
        
        if(this.refreshActiveOnly == true) { // if only refreshing one itinerary; e.g. if next/prev was used

        	console.log("refresh!!");
        	console.log("number of itineraries: " + itineraries.length);
//        	for(var i=0; i<itineraries.length; i++){
//        		console.log(itineraries[i]);
//        	}
        	
            // swap the old itinerary for the new one in both the TripPlan object and the local array
            var newItin = itineraries[this.activeIndex-1];
            var oldItin = this.itineraries[this.activeIndex-1];
            oldItin.tripPlan.replaceItinerary(this.activeIndex-1, newItin);
            this.itineraries[this.activeIndex-1] = newItin;

            // create an alert if we moved to another day
            var alerts = null;
            if(newItin.differentServiceDayFrom(oldItin)) {
                alerts = [ "This itinerary departs on a different day from the previous one"];
            }

            // refresh all itinerary headers
            this.renderHeadersPHUONG();

            // refresh the main itinerary content
            var itinContainer = $('#'+divId+'-'+this.activeIndex);
            itinContainer.empty();
            this.renderItinerary(newItin, this.activeIndex-1, alerts).appendTo(itinContainer);
            this.refreshActiveOnly = false;
            return;
        }

        this.itineraries = itineraries;

        this.clear();
        //TRANSLATORS: widget title
        this.setTitle(ngettext("%d Itinerary Returned", "%d Itineraries Returned", this.itineraries.length));

        var html = "<div id='"+divId+"' class='otp-itinsAccord'></div>";
        this.itinsAccord = $(html).appendTo(this.$());

        this.footer = $('<div class="otp-itinsWidget-footer" />').appendTo(this.$());
        if(this.showButtonRow && queryParams.mode !== "WALK" && queryParams.mode !== "BICYCLE") {
            this.renderButtonRow();
        }
        if(this.showSearchLink) {
            var link = this.constructLink(queryParams,
                                          jQuery.isFunction(this.module.getAdditionalUrlParams) ?
                                              this.module.getAdditionalUrlParams() : null);
                                          //TODO: Where does this link?
            $('<div class="otp-itinsWidget-searchLink">[<a href="'+link+'">'+_tr("Link to search")+'</a>]</div>').appendTo(this.footer);
        }

		//PHUONG:
		var j = 0;
		var headerDivId = divId+'-headerContent-'+j;
		$('<h3><div id='+headerDivId+'></div></h3>')
		.appendTo(this.itinsAccord)
		.data('index', j)
		.click(function(evt) {
			this_.activeIndex = $(this).data('index');
		});

		$('<div id="'+divId+'-'+j+'"></div>')
		.appendTo(this.itinsAccord)
		.append(this.renderResultSummary());
	    //END PHUONG
	    
		//START SHUAI (07-03-2017)
		//sort the result summary according to the header indicator
		var headers = $("#table_it tr:eq(0)").children();
        for(var i=0; i<headers.length; i++){
            var header = headers.eq(i);
            header.on("click", {id: i, header:header}, function(e){
                var arr = [];
                var rows = $("#table_it tr:gt(0)");
                for(var j=0; j<rows.length; j++){
                        arr[j] = rows.eq(j);
                }
                arr.sort(function(row1, row2){
                    n1 = row1.children().eq(e.data.id).text();
                    n2 = row2.children().eq(e.data.id).text();
                    if($.isNumeric(n1)){
                    	n1 = parseFloat(n1);
                    	n2 = parseFloat(n2);
                    	return n1-n2;
                    }
                    else{
                    	if(e.data.header.text() === "Duration (hours)      "){
    						var time1 = n1.split(/hrs,|mins/);
    						time1[0] = parseFloat(time1[0]);
    						time1[1] = parseFloat(time1[1]);
    						var time2 = n2.split(/hrs,|mins/);
    						time2[0] = parseFloat(time2[0]);
    						time2[1] = parseFloat(time2[1]);						
    						if(time1[0] > time2[0])
    							return 1;
    						else if(time1[0] < time2[0])
    							return -1;
    						else{
    							if(time1[1] > time2[1])
    								return 1;
    							else if(time1[1] < time2[1])
    								return -1;
    							else 
    								return 0;
    						}
    					}
    					else{
    						if(n1>n2)
    								return 1;
    						else if(n1<n2)
    								return -1;
    						else
    								return 0;
    						}
                    }
                })
                for(var j=0; j<arr.length; j++){
                    $("#table_it").append(arr[j]);
                }
            })
        }
        //END SHUAI
            
		for(var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
            //$('<h3><span id='+divId+'-headerContent-'+i+'>'+this.headerContent(itin, i)+'<span></h3>').appendTo(this.itinsAccord).click(function(evt) {
            //$('<h3>'+this.headerContent(itin, i)+'</h3>').appendTo(this.itinsAccord).click(function(evt) {

            var headerDivId = divId+'-headerContent-'+(i+1);
            $('<h3><div id='+headerDivId+'></div></h3>')
            .appendTo(this.itinsAccord)
            .data('itin', itin)
            .data('index', i+1)
            .click(function(evt) {
                var itin = $(this).data('itin');
                this_.module.drawItinerary(itin);
                this_.activeIndex = $(this).data('index');
            });
            
			//Shuai (04-04-2017) highlight the preferred trip
			if(this.module.webapp.loginWidget.logged_in){
				if(itin.itinData.fromDatabase == true){
					$('#' + headerDivId).css('background-color', 'Violet');
				}
			}
			//End Shuai

            $('<div id="'+divId+'-'+(i+1)+'"></div>')
            .appendTo(this.itinsAccord)
            .append(this.renderItinerary(itin, queryParams, i));
        }
        this.activeIndex = parseInt(itinIndex) || 0;

        this.itinsAccord.accordion({
            active: this.activeIndex,
            heightStyle: "fill"
        });

        // headers must be rendered after accordion is laid out to work around chrome layout bug
        /*for(var i=0; i<this.itineraries.length; i++) {
            var header = $("#"+divId+'-headerContent-'+i);
            this.renderHeaderContent(itineraries[i], i, header);
        }*/
        this.renderHeadersPHUONG();
        this_.itinsAccord.accordion("resize");

        this.$().resize(function(){
            this_.itinsAccord.accordion("resize");
            this_.renderHeadersPHUONG();
        });

        this.$().draggable({ cancel: "#"+divId });

    },

    clear : function() {
        if(this.itinsAccord !== null) this.itinsAccord.remove();
        if(this.footer !== null) this.footer.remove();
    },

    renderButtonRow : function() {

    	//Shuai (16-03-2017) fix the indexing in method 'renderButtonRow' and 'updateItineraries' in order to make ButtonRow works properly.
    	
        var serviceBreakTime = "03:00am";
        var this_ = this;
        var buttonRow = $("<div class='otp-itinsButtonRow'></div>").appendTo(this.footer);
        //TRANSLATORS: button to first itinerary
        $('<button>'+_tr("First")+'</button>').button().appendTo(buttonRow).click(function() {
            var itin = this_.itineraries[this_.activeIndex-1];
            var params = itin.tripPlan.queryParams;
            var stopId = itin.getFirstStopID();
            _.extend(params, {
                startTransitStopId :  stopId,
                date: moment(this_.module.date, otp.config.locale.time.date_format).format("MM-DD-YYYY"),
                time : serviceBreakTime,
                arriveBy : false
            });
            this_.refreshActiveOnly = true;
            this_.module.updateActiveOnly = true;
            this_.module.planTripFunction.call(this_.module, params);
        });
        //TRANSLATORS: button to previous itinerary
        $('<button>'+_tr("Previous")+'</button>').button().appendTo(buttonRow).click(function() {
        	console.log("activeIndex: " + this_.activeIndex);
            var itin = this_.itineraries[this_.activeIndex-1];
            var params = itin.tripPlan.queryParams;
            var newEndTime = itin.itinData.endTime - 90000;
            var stopId = itin.getFirstStopID();
            _.extend(params, {
                startTransitStopId :  stopId,
                time : otp.util.Time.formatItinTime(newEndTime, "h:mma"),
                date : otp.util.Time.formatItinTime(newEndTime, "MM-DD-YYYY"),
                arriveBy : true
            });
            this_.refreshActiveOnly = true;
            this_.module.updateActiveOnly = true;
            this_.module.planTripFunction.call(this_.module, params);
        });
        //TRANSLATORS: button to next itinerary
        $('<button>'+_tr("Next")+'</button>').button().appendTo(buttonRow).click(function() {
            var itin = this_.itineraries[this_.activeIndex-1];
            var params = itin.tripPlan.queryParams;
            var newStartTime = itin.itinData.startTime + 90000;
            var stopId = itin.getFirstStopID();
            _.extend(params, {
                startTransitStopId :  stopId,
                time : otp.util.Time.formatItinTime(newStartTime, "h:mma"),
                date : otp.util.Time.formatItinTime(newStartTime, "MM-DD-YYYY"),
                arriveBy : false
            });
            this_.refreshActiveOnly = true;
            this_.module.updateActiveOnly = true;
            this_.module.planTripFunction.call(this_.module, params);
        });
        //TRANSLATORS: button to last itinerary
        $('<button>'+_tr("Last")+'</button>').button().appendTo(buttonRow).click(function() {
            var itin = this_.itineraries[this_.activeIndex-1];
            var params = itin.tripPlan.queryParams;
            var stopId = itin.getFirstStopID();
            _.extend(params, {
                startTransitStopId :  stopId,
                date : moment(this_.module.date, otp.config.locale.time.date_format).add('days', 1).format("MM-DD-YYYY"),
                time : serviceBreakTime,
                arriveBy : true
            });
            this_.refreshActiveOnly = true;
            this_.module.updateActiveOnly = true;
            this_.module.planTripFunction.call(this_.module, params);
        });
    },

    // returns HTML text
    headerContent : function(itin, index) {
        // show number of this itinerary (e.g. "1.")
        //var html= '<div class="otp-itinsAccord-header-number">'+(index+1)+'.</div>';

        /*
        // show iconographic trip leg summary
        html += '<div class="otp-itinsAccord-header-icons">'+itin.getIconSummaryHTML()+'</div>';

        // show trip duration
        html += '<div class="otp-itinsAccord-header-duration">('+itin.getDurationStr()+')</div>';

        if(itin.groupSize) {
            html += '<div class="otp-itinsAccord-header-groupSize">[Group size: '+itin.groupSize+']</div>';
        } */

        var div = $('<div style="position: relative; height: 20px; background: yellow;"></div>');
		div.append('<div style="position:absolute; width: 20px; height: 20px; background: red;">'+(index+1)+'</div>');
        console.log("header div width: "+div.width());
        // clear div
        //html += '<div style="clear:both;"></div>';
        return div;
    },

    renderHeaders : function() {
        for(var i=0; i<this.itineraries.length; i++) {
            var header = $("#"+this.id+'-itinsAccord-headerContent-'+i);
            this.renderHeaderContent(this.itineraries[i], i, header);
        }
    },
	
	renderHeadersPHUONG : function() {
		var j = 0;
		var header = $("#"+this.id+'-itinsAccord-headerContent-'+j);
		this.renderHeaderContentPHUONG(j, header);
		for(var i=0; i<this.itineraries.length; i++) {
            var header = $("#"+this.id+'-itinsAccord-headerContent-'+(i+1));
            this.renderHeaderContent(this.itineraries[i], i, header);
        }
    },
	
	renderHeaderContentPHUONG : function(index, parentDiv) {
        parentDiv.empty();
        var div = $('<div style="position: relative; height: 20px;"></div>').appendTo(parentDiv);
		div.append('<div class="otp-itinsAccord-header-number">'+ "RESULT SUMMARY" + '</div>');
   	},


    renderHeaderContent : function(itin, index, parentDiv) {
    	var has2ndDest = false;
    	
    	parentDiv.empty();
        parentDiv.append('<div class="otp-itinsAccord-header-number">'+(index+1)+'.</div>');
        var div = $('<div style="position: relative; height: 20px;"></div>').appendTo(parentDiv);
        //var div2 = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
        //div.append('<div class="otp-itinsAccord-header-number">'+(index+1)+'.</div>');
	
        var maxSpan = itin.tripPlan.latestEndTime - itin.tripPlan.earliestStartTime;
        var startPct = (itin.itinData.startTime - itin.tripPlan.earliestStartTime) / maxSpan;
        var itinSpan = itin.getEndTime() - itin.getStartTime();
        var timeWidth = 32;
        var startPx = 20+timeWidth, endPx = div.width()-timeWidth - (itin.groupSize ? 48 : 0);
        var pxSpan = endPx-startPx;
        var leftPx = startPx + startPct * pxSpan;
        var widthPx = pxSpan * (itinSpan / maxSpan);

        var timeStr = otp.util.Time.formatItinTime(itin.getStartTime(), otp.config.locale.time.time_format);
        div.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');

        var timeStr = otp.util.Time.formatItinTime(itin.itinData.endTime, otp.config.locale.time.time_format);
        div.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr + '</div>');

        //render the 2nd destination if exist
        for(var l=0; l<itin.itinData.legs.length; l++) {
        	if(itin.itinData.legs[l].multiDestinationId == '1')
        		has2ndDest = true;
        }
        
        var div2;
        var itinSpan2;
        var widthPx2;

        if(has2ndDest){
        	div2 = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
        	
        	//define the parameters based on the 2nd destination
        	var end = itin.itinData.legs[itin.itinData.legs.length-1].endTime;

        	itinSpan2 = end - itin.getStartTime();
        	widthPx2 = pxSpan * (itinSpan2 / maxSpan);
        	
        	var timeStr2 = otp.util.Time.formatItinTime(itin.getStartTime(), otp.config.locale.time.time_format);
            div2.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr2 + '</div>');

            var timeStr2 = otp.util.Time.formatItinTime(end, otp.config.locale.time.time_format);
            div2.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr2 + '</div>');
        }
        
        for(var l=0; l<itin.itinData.legs.length; l++) {
        	var leg = itin.itinData.legs[l];

        	var startPct = (leg.startTime - itin.tripPlan.earliestStartTime) / maxSpan;
            var endPct = (leg.endTime - itin.tripPlan.earliestStartTime) / maxSpan;
            var leftPx = startPx + startPct * pxSpan + 1;
            var widthPx = pxSpan * (leg.endTime - leg.startTime) / maxSpan - 1;
            
        	//check which destination the leg belongs to
        	if(leg.multiDestinationId == '0'){   	
	            var showRouteLabel = widthPx > 40 && otp.util.Itin.isTransit(leg.mode) && leg.routeShortName && leg.routeShortName.length <= 6;
	            var segment = $('<div class="otp-itinsAccord-header-segment" />')
	            .css({
	                width: widthPx,
	                left: leftPx,
	                background: this.getModeColor(leg.mode)+' url('+otp.config.resourcePath+'images/mode/'+leg.mode.toLowerCase()+'.png) center no-repeat'
	            })
	            .appendTo(div);
	            if(showRouteLabel) segment.append('<div style="margin-left:'+(widthPx/2+9)+'px;">'+leg.routeShortName+'</div>');
        	}
        	else{
	            var segment2 = null;
	            
	            var showRouteLabel = widthPx > 40 && otp.util.Itin.isTransit(leg.mode) && leg.routeShortName && leg.routeShortName.length <= 6;
	            segment2 = $('<div class="otp-itinsAccord-header-segment" />')
	            .css({
	                width: widthPx,
	                left: leftPx,
	                background: this.getModeColor(leg.mode)+' url('+otp.config.resourcePath+'images/mode/'+leg.mode.toLowerCase()+'.png) center no-repeat'
	            })
	            .appendTo(div2);
	            if(showRouteLabel) segment2.append('<div style="margin-left:'+(widthPx/2+9)+'px;">'+leg.routeShortName+'</div>');
            }   
        }
    },

    getModeColor : function(mode) {
        if(mode === "WALK") return '#bbb';
        if(mode === "BICYCLE") return '#44f';
        if(mode === "SUBWAY") return '#f4c20d';
        if(mode === "RAIL") return '#f4c20d';
        if(mode === "BUS") return '#0f0';
        if(mode === "TRAM") return '#f4c20d';
       // if(mode === "AIRPLANE") return '#f0f';
		if(mode === "FERRY") return '#00bbbb';		
        return '#aaa';
    },


    municoderResultId : 0,

	
	  // returns jQuery object
    renderResultSummary : function() {
	    
		var this_ = this;
		var itinDiv = $("<div></div>");       
		
	
		// add trip summary

		/*var j = 20;
		itinDiv.append('<div style="margin-left:'+j+'px;">'+_tr("Number")+'</div>');
		itinDiv.append('<div style="margin-left:'+(j+20)+'px;">'+ "Total cost"+'</div>');
		
		for(var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
			itinDiv.append('<div style="margin-left:'+j+'px;">'+ (i+1)+'</div>');
			itinDiv.append('<div style="margin-left:'+(j+20)+'px;">'+ itin.itinData.totalcost.toFixed(2)+'</div>');
		}
		
		itinDiv.append('<div style="color:#0000FF" class="otp-itinTripSummaryLabel">' + _tr("Number") + '</div><div class="otp-itinTripSummaryText">'+"Total cost"+ '</div><div class="otp-itinTripSummaryText1">'+"Duration"+ '</div><div class="otp-itinTripSummaryText2">'+"CO2 (kg)"+ '</div><div class="otp-itinTripSummaryText3">'+"Distance (km)"+ '</div>');			
        for(var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
			itinDiv.append('<div class="otp-itinTripSummaryLabel">' + (i+1) + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost.toFixed(2) + '</div><div class="otp-itinTripSummaryText1">'+itin.getDurationStr() + '</div><div class="otp-itinTripSummaryText2">'+itin.itinData.CO2.toFixed(2)  + '</div><div class="otp-itinTripSummaryText3">'+itin.itinData.distance.toFixed(2) + '</div>');			
		}

		itinDiv.append('<div style="color:#0000FF" class="otp-itinTripSummaryLabel">' + _tr("Number") + '</div><div class="otp-itinTripSummaryText">'+"Total cost"+ '</div><div class="otp-itinTripSummaryText">'+"Duration"+ '</div><div class="otp-itinTripSummaryText">'+"CO2 (kg)"+ '</div><div class="otp-itinTripSummaryText">'+"Distance (km)"+ '</div>');			
        for(var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
			itinDiv.append('<div class="otp-itinTripSummaryLabel">' + (i+1) + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost.toFixed(2) + '</div><div class="otp-itinTripSummaryText">'+itin.getDurationStr() + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.CO2.toFixed(2)  + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.distance.toFixed(2) + '</div>');			
		}
		
		var html = '<table>';
		for (var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
			html += '<tr><td>' + (i+1) + '</td></tr>';
		}
		html += '</table>';
		itinDiv.append(html);*/
		
		
		/*var html = '<table class="table_itineraries" border="15" id="table_it">';
		html += '<tr><th>' +  'Number     ' + '</th>';
		html += '<th>' +  'Total cost (euros)     ' + '</th>';
		html += '<th>' +  'Duration (hours)     ' + '</th>';
		html += '<th>' +  'CO2 (kg)     ' + '</th>';
		html += '<th>' +  'Distance (km)     ' + '</th>';
		html += '</tr>';

		for (var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];
			html += '<tr><td>' + (i+1) + '</td>';
			html += '<td>' + itin.itinData.totalcost.toFixed(2) + '</td>';
			html += '<td>' + itin.getDurationStr() + '</td>';
			html += '<td>' + itin.itinData.CO2.toFixed(2) + '</td>';
			html += '<td>' + itin.itinData.distance.toFixed(2) + '</td>';
			html += '</tr>';
		}
		html += '</table>';
		itinDiv.append(html);*/
		
		/*var html1 = '<div class="tablePHUONG">';
		html1+='<div class="rowPHUONG"><div class="cellPHUONG"><p>Blah blah</p></div><div class="cellPHUONG"><p>Blah blah</p></div><div class="cellPHUONG"><p>Blah blah</p></div></div><div class="rowPHUONG"><div class="cellPHUONG"><p>Blah blah</p></div><div class="cellPHUONG"><p>Blah blah</p></div><div class="cellPHUONG"><p>Blah blah</p></div></div></div>';
        itinDiv.append(html1);*/
		if (this.itineraries.length > 0)
		{
			if (this.itineraries[0].itinData.velocity > 0)
			{
				var table = $('<table class="table_itineraries" border="1" id="table_it"></table>');
				var row = $("<tr></tr>");
				var cell = $("<th></th>").text("Number    ").appendTo(row);
				var cell1 = $("<th></th>").text("Transport Modes    ").appendTo(row);
				var cell2 = $("<th></th>").text("Itinerary quality       ").appendTo(row);
				//var cell3 = $("<th></th>").text("Total cost (euros)     ").appendTo(row);
				var cell4 = $("<th></th>").text("Duration (hours)      ").appendTo(row);
				var cell5 = $("<th></th>").text("CO2 (kg)"      ).appendTo(row);
				var cell6 = $("<th></th>").text("Distance (km)       ").appendTo(row);
				var cell7 = $("<th></th>").text("Velocity (knots)       ").appendTo(row);

				table.append(row);
				for (var i=0; i<this.itineraries.length; i++) {
					var itin = this.itineraries[i];
					var row = $("<tr></tr>");
					var cell = $("<td></td>").text(i+1).appendTo(row);
					var cell1 = $("<td></td>").text(itin.getTransportMode()).appendTo(row);
					var cell2 = $("<td></td>").text(itin.itinData.quality).appendTo(row);
					//var cell3 = $("<td></td>").text(itin.itinData.totalcost.toFixed(2)).appendTo(row);
					var cell4 = $("<td></td>").text(itin.getDurationStr()).appendTo(row);
					var cell5 = $("<td></td>").text(itin.itinData.CO2.toFixed(2)).appendTo(row);
					var cell6 = $("<td></td>").text(itin.itinData.distance.toFixed(2)).appendTo(row);
					var cell7 = $("<td></td>").text(itin.itinData.velocity).appendTo(row);
					table.append(row);
				}
				itinDiv.append(table);		
				return itinDiv;	
			}
			else
			{
				var table = $('<table class="table_itineraries" border="1" id="table_it"></table>');
				var row = $("<tr></tr>");
				var cell = $("<th></th>").text("Number    ").appendTo(row);
				var cell1 = $("<th></th>").text("Transport Modes    ").appendTo(row);
				var cell2 = $("<th></th>").text("Itinerary quality       ").appendTo(row);
				//var cell3 = $("<th></th>").text("Total cost (euros)     ").appendTo(row);
				var cell4 = $("<th></th>").text("Duration (hours)      ").appendTo(row);
				var cell5 = $("<th></th>").text("CO2 (kg)"      ).appendTo(row);
				var cell6 = $("<th></th>").text("Distance (km)       ").appendTo(row);
				

				table.append(row);
				for (var i=0; i<this.itineraries.length; i++) {
					var itin = this.itineraries[i];
					var row = $("<tr></tr>");
					var cell = $("<td></td>").text(i+1).appendTo(row);
					var cell1 = $("<td></td>").text(itin.getTransportMode()).appendTo(row);
					var cell2 = $("<td></td>").text(itin.itinData.quality).appendTo(row);
					//var cell3 = $("<td></td>").text(itin.itinData.totalcost.toFixed(2)).appendTo(row);
					var cell4 = $("<td></td>").text(itin.getDurationStr()).appendTo(row);
					var cell5 = $("<td></td>").text(itin.itinData.CO2.toFixed(2)).appendTo(row);
					var cell6 = $("<td></td>").text(itin.itinData.distance.toFixed(2)).appendTo(row);
					
					//Shuai (04-04-2017) highlight the preferred trip
					if(this.module.webapp.loginWidget.logged_in){
						if(itin.itinData.fromDatabase == true){
							row.children().css('color', 'Violet');
						}
					}
					//End Shuai
				
					table.append(row);
				}
				itinDiv.append(table);
				return itinDiv;	
			}
			
		
                                						
                                
                                
		}
		else return itinDiv;
    },
	
	
    // returns jQuery object
    renderItinerary : function(itin, queryParams, index, alerts) {
        var this_ = this;

        // render legs
        var divId = this.module.id+"-itinAccord-"+index;
        var accordHtml = "<div id='"+divId+"' class='otp-itinAccord'></div>";
        var itinAccord = $(accordHtml);
        for(var l=0; l<itin.itinData.legs.length; l++) {

            var legDiv = $('<div />').appendTo(itinAccord);

            var leg = itin.itinData.legs[l];
            //TRANSLATORS: Used when passengers can stay on vehicle. Continues
            //as [agency] route name
            var headerModeText = leg.interlineWithPreviousLeg ? _tr("CONTINUES AS") : otp.util.Itin.modeString(leg.mode).toUpperCase()
			var headerHtml = "<b>" + headerModeText + "</b>";

            // Add info about realtimeness of the leg
            if (leg.realTime && typeof(leg.arrivalDelay) === 'number') {
                var minDelay = Math.round(leg.arrivalDelay / 60)
                if (minDelay > 0) {
                    //TRANSLATORS: Something in Public transport is x minutes late
                    headerHtml += ' <span style="color:red;">(' + ngettext("%d min late", "%d mins late", minDelay) + ')</span>';
                } else if (minDelay < 0) {
                    //TRANSLATORS: Something in Public transport is x minutes early
                    headerHtml += ' <span style="color:green;">(' + ngettext("%d min early", "%d mins early", (minDelay * -1)) + ')</span>';
                } else {
                    //TRANSLATORS: Something in Public transport is on time
                    headerHtml += ' <span style="color:green;">(' + _tr("on time") + ')</span>';
                }
            }

            if(leg.mode === "WALK" || leg.mode === "BICYCLE" || leg.mode === "CAR") {
                headerHtml += " "+otp.util.Itin.distanceString(leg.distance)+ pgettext("direction", " to ")+otp.util.Itin.getName(leg.to);
                if(otp.config.municoderHostname) {
                    var spanId = this.newMunicoderRequest(leg.to.lat, leg.to.lon);
                    headerHtml += '<span id="'+spanId+'"></span>';
                }
            }
            else if(leg.agencyId !== null) {
                headerHtml += ": "+leg.agencyName+", ";
                if(leg.route !== leg.routeLongName) {
                    headerHtml += "("+leg.route+") "; //PHUONG: route_short_name in route.txt of GTFS
                }
                if (leg.routeLongName) {
                    headerHtml += leg.routeLongName;
                }

                if(leg.headsign) {
                    /*TRANSLATORS: used in sentence like: <Long name of public transport route> "to" <Public transport
                    headsign>. Used in showing itinerary*/
                    headerHtml +=  pgettext("bus_direction", " to ") + leg.headsign;
                }
				
				/*headerHtml += " CO2: "+leg.CO2.toFixed(2) +" kg; ";
				headerHtml += " cCO2: "+leg.costCO2.toFixed(2) +" euros; ";
				headerHtml += " Dist: "+(leg.distance/1000).toFixed(2) + " km";
				headerHtml += " cDist: "+(leg.costdistance).toFixed(2) + " euros";
				headerHtml += " cTime: "+(leg.costtime).toFixed(2) + " euros";
				headerHtml += " TC: "+leg.totalcost.toFixed(2) +" euros; ";*/
				
				headerHtml += " [Cost: "+leg.totalcost.toFixed(2) +" euros;";
				headerHtml += " Duration: "+otp.util.Time.secsToHrMin(leg.duration);
				headerHtml += "; CO2: "+leg.CO2.toFixed(2) +" kg; ";
				headerHtml += " Distance: "+(leg.distance/1000).toFixed(2) + " km]";
				
                if(leg.alerts) {
                    headerHtml += '&nbsp;&nbsp;<img src="images/alert.png" style="vertical-align: -20%;" />';
                }
            }

            $("<h3>"+headerHtml+"</h3>").appendTo(legDiv).data('leg', leg).hover(function(evt) {
                //var arr = evt.target.id.split('-');
                //var index = parseInt(arr[arr.length-1]);
                var thisLeg = $(this).data('leg');
                this_.module.highlightLeg(thisLeg);
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawStartBubble(thisLeg, true);
                this_.module.drawEndBubble(thisLeg, true);
            }, function(evt) {
                this_.module.clearHighlights();
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawAllStartBubbles(itin);
            });
            this_.renderLeg(leg,
                            l>0 ? itin.itinData.legs[l-1] : null, // previous
                            l+1 < itin.itinData.legs.length ? itin.itinData.legs[l+1] : null // next
            ).appendTo(legDiv);

            $(legDiv).accordion({
                header : 'h3',
                active: otp.util.Itin.isTransit(leg.mode) ? 0 : false,
                heightStyle: "content",
                collapsible: true
            });
        }

        //itinAccord.accordion({
        /*console.log('#' + divId + ' > div')
        $('#' + divId + ' > div').accordion({
            header : 'h3',
            active: false,
            heightStyle: "content",
            collapsible: true
        });*/

        var itinDiv = $("<div></div>");

        // add alerts, if applicable
        alerts = alerts || [];

        // create an alert if this is a different day from the searched day
        var queryTime = itin.tripPlan.queryParams.date + ' ' + itin.tripPlan.queryParams.time;
        queryTime = moment(queryTime, 'MM-DD-YYYY HH:mma').unix()*1000
        if(itin.differentServiceDayFromQuery(queryTime)) {
            //TRANSLATORS: Shown as alert text before showing itinerary.
            alerts = [ "This itinerary departs on a different day than the one searched for"];
        }

        // check for max walk exceedance
        var maxWalkExceeded = false;
        for(var i=0; i<itin.itinData.legs.length; i++) {
            var leg = itin.itinData.legs[i];
            if(leg.mode === "WALK" && leg.distance > itin.tripPlan.queryParams.maxWalkDistance) {
                maxWalkExceeded = false;
                break;
            }
        }
        if(maxWalkExceeded) {
            //TRANSLATORS: Shown as alert text before showing itinerary.
            alerts.push(_tr("Total walk distance for this trip exceeds specified maximum"));
        }

        for(var i = 0; i < alerts.length; i++) {
            itinDiv.append("<div class='otp-itinAlertRow'>"+alerts[i]+"</div>");
        }

        // add start and end time rows and the main leg accordion display
        //TRANSLATORS: Start: Time and date (Shown before path itinerary)
        itinDiv.append("<div class='otp-itinStartRow'><b>" + pgettext('template', "Start") + "</b>: "+itin.getStartTimeStr()+"</div>");
        itinDiv.append(itinAccord);
        //TRANSLATORS: End: Time and date (Shown after path itinerary)
        itinDiv.append("<div class='otp-itinEndRow'><b>" + _tr("End") + "</b>: "+itin.getEndTimeStr()+"</div>");

        // add trip summary

        var tripSummary = $('<div class="otp-itinTripSummary" />')
        .append('<div class="otp-itinTripSummaryHeader">' + _tr("Itinerary Summary") + '</div>')
        //TRANSLATORS: Travel: hour date on which this trip is made
        //.append('<div class="otp-itinTripSummaryLabel">' + _tr("Departure") + '</div><div class="otp-itinTripSummaryText">'+itin.getStartTimeStr()+'</div>')
        //TRANSLATORS: Time: minutes How long is this trip
        //.append('<div class="otp-itinTripSummaryLabel">' + _tr("Duration") + '</div><div class="otp-itinTripSummaryText">'+itin.getDurationStr()+'</div>');
		
		

        /*var walkDistance = itin.getModeDistance("WALK");
        if(walkDistance > 0) {
            //FIXME: If translation is longer transfers jumps to the right and
            //it is ugly

            //TRANSLATORS: Total foot distance for trip
            tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Total Walk") + '</div><div class="otp-itinTripSummaryText">' +
                otp.util.Itin.distanceString(walkDistance) + '</div>')
        }

        var bikeDistance = itin.getModeDistance("BICYCLE");
        if(bikeDistance > 0) {
            //TRANSLATORS: Total distance on a bike for this trip
            tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Total Bike") + '</div><div class="otp-itinTripSummaryText">' +
                otp.util.Itin.distanceString(bikeDistance) + '</div>')
        }*/

        var carDistance = itin.getModeDistance("CAR");
        if(carDistance > 0) {
            //TRANSLATORS: Total distance in a car for this trip
            tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Total drive") + '</div><div class="otp-itinTripSummaryText">' +
                otp.util.Itin.distanceString(carDistance) + '</div>')
        }

        if(itin.hasTransit) {
            //TRANSLATORS: how many public transit transfers in a trip
           // tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Transfers") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.transfers+'</div>')
            /*if(itin.itinData.walkDistance > 0) {
                tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Total Walk") + '</div><div class="otp-itinTripSummaryText">' +
                    otp.util.Itin.distanceString(itin.itinData.walkDistance) + '</div>')
            }*/

			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Cost") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost.toFixed(2) + " euros" + '</div>');			
			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Duration") + '</div><div class="otp-itinTripSummaryText">'+itin.getDurationStr()+'</div>');
			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("CO2") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.CO2.toFixed(2) + " kg" + '</div>');
		 	tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Distance") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.distance.toFixed(2)+ " km" + '</div>');
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("CostM") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost_multiobjective.toFixed(2) + " euros" + '</div>');
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("WAIT1") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.WAIT1.toFixed(2) + " euros; wait2 = " + itin.itinData.WAIT2.toFixed(2) + "; wait3 = " + itin.itinData.WAIT3.toFixed(2) +  '</div>');
			
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Summary for each transport mode") + '</div><div class="otp-itinTripSummaryText">'+": "+'</div>');
			if (itin.itinData.CO2SHIP > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Ship mode") + '</div><div class="otp-itinTripSummaryText">'+"CO2: " + itin.itinData.CO2SHIP.toFixed(2) + " kg; Distance: " + (itin.itinData.distanceSHIP/1000).toFixed(2) + " km; Cost: " + itin.itinData.totalcostSHIP.toFixed(2) + " euros" + '</div>');
			}
			if (itin.itinData.CO2TRAIN > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Rail mode") + '</div><div class="otp-itinTripSummaryText">'+"CO2: " + itin.itinData.CO2TRAIN.toFixed(2) + " kg; Distance: " + (itin.itinData.distanceTRAIN/1000).toFixed(2) + " km; Cost: " + itin.itinData.totalcostTRAIN.toFixed(2) + " euros" + '</div>');
			}
			if (itin.itinData.CO2TRUCK > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Truck mode") + '</div><div class="otp-itinTripSummaryText">'+"CO2: " + itin.itinData.CO2TRUCK.toFixed(2) + " kg; Distance: " + (itin.itinData.distanceTRUCK/1000).toFixed(2) + " km; Cost: " + itin.itinData.totalcostTRUCK.toFixed(2) + " euros" + '</div>');
			}
			
           //TRANSLATORS: cost of trip
           // tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Fare") +'</div><div class="otp-itinTripSummaryText">'+itin.getFareStr()+'</div>');
        }

        //Shuai (27-03-2017) button for bookmark and booking
        if(this.module.webapp.loginWidget.logged_in){
//        	$('<div class="otp-itinTripSummaryLabel"><input type="button" style="height:20px" value="' + _tr("Bookmark") + '" /></div>')
//        	.on('click', function(){
//        		if(this_.module.webapp.loginWidget.logged_in){ //check if user has logged out
//        			//make a bookmark of a certain itinerary and store it in the database
//        			var url = otp.config.hostname + '/' + otp.config.restService + '/user/bookmark/add';
//        			
//        			$.ajax(url, {
//        				type: 'POST',
//        				data: JSON.stringify({
//        					'username': $('#otp-username :first-child').html(),
//        					'itinerary': itin,
//        					'queryParam': queryParam
//        				}),
//        				dataType: 'JSON',
//        				contentType: "application/json",
//        				
//        				success: function(val){
//							otp.widgets.Dialogs.showOkDialog("You have bookmarked this trip", "Bookmark Successful");
//        				}        				
//        			});
//        		} 
//        		else{
//        			otp.widgets.Dialogs.showOkDialog("Please login!", "Error");
//        		}        			
//        	})
//        	.appendTo(tripSummary);
        	
        	$('<div class="otp-itinTripSummaryLabel"><input type="button" style="height:20px" value="' + _tr("Book this trip") + '" /></div>')
        	.on('click', function(){
        		if(this_.module.webapp.loginWidget.logged_in){ //check if user has logged out
        			otp.widgets.Dialogs.showYesNoDialog("Book this trip?", "Confirm", 
        			function(){
        				//make a booking of a certain itinerary and store it in the database
        				var url = otp.config.hostname + '/' + otp.config.restService + '/user/booking/add';
        				
        				$.ajax(url, {
            				type: 'POST',
            				data: JSON.stringify({
            					'username': $('#otp-username :first-child').html(),
            					'departure': queryParams.fromPlace,
            					'arrival': queryParams.toPlace,
            					'vertices': itin.itinData.verticesLabels
            				}),
            				dataType: 'JSON',
            				contentType: "application/json",
            				
            				success: function(val){
    							otp.widgets.Dialogs.showOkDialog("You have booked this trip", "Booking Successful");
            				}
            			});
        			}, 
        			function(){
        				return;
        			});
        		} 
        		else{
        			otp.widgets.Dialogs.showOkDialog("Please login!", "Error");
        		}        			
        	})
        	.appendTo(tripSummary);
        }
        //End Shuai

        var tripSummaryFooter = $('<div class="otp-itinTripSummaryFooter" />');

        //TRANSLATORS: Valid date time; When is this trip correct
        tripSummaryFooter.append(_tr('Valid') + ' ' + moment().format(otp.config.locale.time.format));

        var itinLink = this.constructLink(itin.tripPlan.queryParams, { itinIndex : index });
        if(this.showItineraryLink) {
            //TRANSLATORS: Links to this itinerary
            tripSummaryFooter.append(' | <a href="'+itinLink+'">' + _tr("Link to Itinerary") + '</a>');
        }

        if(this.showPrintLink) {
            tripSummaryFooter.append(' | ');
            $('<a href="#">' + _tr('Print') +'</a>').click(function(evt) {
                evt.preventDefault();

                var printWindow = window.open('','SynchroNET Planner Results','toolbar=yes, scrollbars=yes, height=500, width=800');
                printWindow.document.write(itin.getHtmlNarrative());

            }).appendTo(tripSummaryFooter);
        }
        if(this.showEmailLink) {
            //TRANSLATORS: Default subject when sending trip to email
            var subject = _tr("Your Trip");
            var body = itin.getTextNarrative(itinLink);
            //TRANSLATORS: Link to send trip by email
            tripSummaryFooter.append(' | <a href="mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)+'" target="_blank">' + _tr("Email") + '</a>');
        }

        tripSummary.append(tripSummaryFooter)
        .appendTo(itinDiv);


        return itinDiv;
    },

    renderLeg : function(leg, previousLeg, nextLeg) {
        var this_ = this;

        if(otp.util.Itin.isTransit(leg.mode)) {
            var legDiv = $('<div></div>');

            // show the start time and stop

            // prevaricate if this is a nonstruct frequency trip
            if( leg.isNonExactFrequency === true ){
                //TRANSLATORS: public transport drives every N minutes
            	$('<div class="otp-itin-leg-leftcol">' + ngettext("every %d min", "every %d mins", (leg.headway/60))+"</div>").appendTo(legDiv);
            } else {
                $('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.startTime, otp.config.locale.time.time_format)+"</div>").appendTo(legDiv);
            }

            //TRANSLATORS: Depart station / Board at station in itinerary
            var startHtml = '<div class="otp-itin-leg-endpointDesc">' + (leg.interlineWithPreviousLeg ? "<b>" + pgettext("itinerary", "Depart") + "</b> " : _tr("<b>Board</b> at ")) +leg.from.name;
            if(otp.config.municoderHostname) {
                var spanId = this.newMunicoderRequest(leg.from.lat, leg.from.lon);
                startHtml += '<span id="'+spanId+'"></span>';
            }
            startHtml += '</div>';

            $(startHtml).appendTo(legDiv)
            .click(function(evt) {
                this_.module.webapp.map.lmap.panTo(new L.LatLng(leg.from.lat, leg.from.lon));
            }).hover(function(evt) {
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawStartBubble(leg, true);
            }, function(evt) {
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawAllStartBubbles(this_.itineraries[this_.activeIndex-1]);
            });

            var stopHtml = '<div class="otp-itin-leg-endpointDescSub">';
            if( typeof leg.from.stopCode != 'undefined' ) {
                stopHtml += _tr("Stop") + ' #'+leg.from.stopCode+ ' ';
            }
            stopHtml += '[<a href="#">' + _tr("Stop Viewer") +'</a>]</div>';

            $(stopHtml)
            .appendTo(legDiv)
            .click(function(evt) {
                if(!this_.module.stopViewerWidget) {
                    this_.module.stopViewerWidget = new otp.widgets.transit.StopViewerWidget("otp-"+this_.module.id+"-stopViewerWidget", this_.module);
                    this_.module.stopViewerWidget.$().offset({top: evt.clientY, left: evt.clientX});
                }
                this_.module.stopViewerWidget.show();
                this_.module.stopViewerWidget.setActiveTime(leg.startTime);
                this_.module.stopViewerWidget.setStop(leg.from.stopId, leg.from.name);
                this_.module.stopViewerWidget.bringToFront();
            });


            $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);

            // show the "time in transit" line

            var inTransitDiv = $('<div class="otp-itin-leg-elapsedDesc" />').appendTo(legDiv);

            $('<span><i>' + _tr("Time in transit") + ": " + otp.util.Time.secsToHrMin(leg.duration)+'</i></span>').appendTo(inTransitDiv);

            $('<span>&nbsp;[<a href="#">' + _tr("Trip Viewer") + '</a>]</span>')
            .appendTo(inTransitDiv)
            .click(function(evt) {
                if(!this_.module.tripViewerWidget) {
                    this_.module.tripViewerWidget = new otp.widgets.transit.TripViewerWidget("otp-"+this_.module.id+"-tripViewerWidget", this_.module);
                    this_.module.tripViewerWidget.$().offset({top: evt.clientY, left: evt.clientX});
                }
                this_.module.tripViewerWidget.show();
                if(this_.module.tripViewerWidget.minimized) this_.module.tripViewerWidget.unminimize();
                this_.module.tripViewerWidget.update(leg);
                this_.module.tripViewerWidget.bringToFront();
            });

            // show the intermediate stops, if applicable -- REPLACED BY TRIP VIEWER

            /*if(this.module.showIntermediateStops) {

                $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
                var intStopsDiv = $('<div class="otp-itin-leg-intStops"></div>').appendTo(legDiv);

                var intStopsListDiv = $('<div class="otp-itin-leg-intStopsList"></div>')

                $('<div class="otp-itin-leg-intStopsHeader">'+leg.intermediateStops.length+' Intermediate Stops</div>')
                .appendTo(intStopsDiv)
                .click(function(event) {
                    intStopsListDiv.toggle();
                });

                intStopsListDiv.appendTo(intStopsDiv);

                for(var i=0; i < leg.intermediateStops.length; i++) {
                    var stop = leg.intermediateStops[i];
                    $('<div class="otp-itin-leg-intStopsListItem">'+(i+1)+'. '+stop.name+' (ID #'+stop.stopId.id+')</div>').
                    appendTo(intStopsListDiv)
                    .data("stop", stop)
                    .click(function(evt) {
                        var stop = $(this).data("stop");
                        this_.module.webapp.map.lmap.panTo(new L.LatLng(stop.lat, stop.lon));
                    }).hover(function(evt) {
                        var stop = $(this).data("stop");
                        $(this).css('color', 'red');
                        var popup = L.popup()
                            .setLatLng(new L.LatLng(stop.lat, stop.lon))
                            .setContent(stop.name)
                            .openOn(this_.module.webapp.map.lmap);
                    }, function(evt) {
                        $(this).css('color', 'black');
                        this_.module.webapp.map.lmap.closePopup();
                    });
                }
                intStopsListDiv.hide();
            }*/

            // show the end time and stop

            $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);

            if( leg.isNonExactFrequency === true ) {
            	$('<div class="otp-itin-leg-leftcol">' + _tr('late as') + ' ' + otp.util.Time.formatItinTime(leg.endTime, otp.config.locale.time.time_format)+"</div>").appendTo(legDiv);
            } else {
                $('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.endTime, otp.config.locale.time.time_format)+"</div>").appendTo(legDiv);
            }

            //TRANSLATORS: Stay on board/Alight [at stop name]
            var endAction = (nextLeg && nextLeg.interlineWithPreviousLeg) ? _tr("Stay on board") : _tr("Alight");
            //TRANSLATORS: [Stay on board/Alight] at [stop name]
            var endHtml = '<div class="otp-itin-leg-endpointDesc"><b>' + endAction + '</b> ' + _tr('at')+ ' ' +leg.to.name;
            if(otp.config.municoderHostname) {
                spanId = this.newMunicoderRequest(leg.to.lat, leg.to.lon);
                endHtml += '<span id="'+spanId+'"></span>';
            }
            endHtml += '</div>';

            $(endHtml).appendTo(legDiv)
            .click(function(evt) {
                this_.module.webapp.map.lmap.panTo(new L.LatLng(leg.to.lat, leg.to.lon));
            }).hover(function(evt) {
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawEndBubble(leg, true);
            }, function(evt) {
                this_.module.pathMarkerLayer.clearLayers();
                this_.module.drawAllStartBubbles(this_.itineraries[this_.activeIndex-1]);
            });


            // render any alerts

            if(leg.alerts) {
                for(var i = 0; i < leg.alerts.length; i++) {
                    var alert = leg.alerts[i];

                    var alertDiv = ich['otp-planner-alert']({ alert: alert, leg: leg }).appendTo(legDiv);
                    alertDiv.find('.otp-itin-alert-description').hide();

                    alertDiv.find('.otp-itin-alert-toggleButton').data('div', alertDiv).click(function() {
                        var div = $(this).data('div');
                        var desc = div.find('.otp-itin-alert-description');
                        var toggle = div.find('.otp-itin-alert-toggleButton');
                        if(desc.is(":visible")) {
                            desc.slideUp();
                            toggle.html("&#x25BC;");
                        }
                        else {
                            desc.slideDown();
                            toggle.html("&#x25B2;");
                        }
                    });
                }
            }

            return legDiv;
        }
        else if (leg.steps) { // walk / bike / car
            var legDiv = $('<div></div>');
            if (leg && leg.steps) {
                for(var i=0; i<leg.steps.length; i++) {
                    var step = leg.steps[i];
                    var text = otp.util.Itin.getLegStepText(step);

                    var html = '<div id="foo-'+i+'" class="otp-itin-step-row">';
                    html += '<div class="otp-itin-step-icon">';
                    if(step.relativeDirection)
                        html += '<img src="'+otp.config.resourcePath+'images/directions/' +
                            step.relativeDirection.toLowerCase()+'.png">';
                    html += '</div>';
                    var distArr= otp.util.Itin.distanceString(step.distance).split(" ");
                    html += '<div class="otp-itin-step-dist">' +
                        '<span style="font-weight:bold; font-size: 1.2em;">' +
                        distArr[0]+'</span><br>'+distArr[1]+'</div>';
                    html += '<div class="otp-itin-step-text">'+text+'</div>';
                    html += '<div style="clear:both;"></div></div>';

                    $(html).appendTo(legDiv)
                    .data("step", step)
                    .data("stepText", text)
                    .click(function(evt) {
                        var step = $(this).data("step");
                        this_.module.webapp.map.lmap.panTo(new L.LatLng(step.lat, step.lon));
                    }).hover(function(evt) {
                        var step = $(this).data("step");
                        $(this).css('background', '#f0f0f0');
                        var popup = L.popup()
                            .setLatLng(new L.LatLng(step.lat, step.lon))
                            .setContent($(this).data("stepText"))
                            .openOn(this_.module.webapp.map.lmap);
                    }, function(evt) {
                        $(this).css('background', '#e8e8e8');
                        this_.module.webapp.map.lmap.closePopup();
                    });
                }
            }
            return legDiv;
        }
        return $("<div>Leg details go here</div>");
    },

    constructLink : function(queryParams, additionalParams) {
        additionalParams = additionalParams ||  { };
        return otp.config.siteUrl + '?module=' + this.module.id + "&" +
            otp.util.Text.constructUrlParamString(_.extend(_.clone(queryParams), additionalParams));
    },

    newMunicoderRequest : function(lat, lon) {

        this.municoderResultId++;
        var spanId = 'otp-municoderResult-'+this.municoderResultId;

        console.log("muniReq");
        $.ajax(otp.config.municoderHostname+"/opentripplanner-municoder/municoder", {

            data : { location : lat+","+lon },
            dataType:   'jsonp',

            success: function(data) {
                if(data.name) {
                    $('#'+spanId).html(", "+data.name);
                }
            }
        });
        return spanId;
    }


});

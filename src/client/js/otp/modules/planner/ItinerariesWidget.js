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

    // controls : null,
    module : null,

    itinsAccord : null,
    footer : null,

    itineraries : null,
    activeIndex : 0,
    queryParams: null,
    
    // set to true by next/previous/etc. to indicate to only refresh the currently active itinerary
    refreshActiveOnly : false,
    showButtonRow : false,    //Shuai (22-03-2017) temporarily disable the buttonRow, waiting for decisions. 
    showItineraryLink : true,
    showPrintLink : true,
    showEmailLink : true,
    showSearchLink : false,
    
    // yuanyuan(8/18/2017) add risk triangle
    // itineraryWidget_inputChanged : null,
    riskTriangle : null,
   
    gradientColors: null,
    
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
    	console.log(itineraries)
    	console.log(queryParams);
        var this_ = this;
        var divId = this.id+"-itinsAccord";        
        
	    this.$().css({
	    	'overflow': 'hidden',
	    	'max-height': $(window).height()*0.75,
	    	'width': $(window).width()/2,
	    	'height': $(window).height()/2,
	    });

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
        this.queryParams = queryParams;
        
        this.gradientColors = this.gradientColorForQuality()

        this.clear();
        //TRANSLATORS: widget title
        this.setTitle(ngettext("%d Itinerary Returned", "%d Itineraries Returned", this.itineraries.length));

        var html = "<div id='"+divId+"' class='otp-itinsAccord'></div>";
        this.itinsAccord = $(html).appendTo(this.$());
        
	    this.itinsAccord.css({
	    	'overflow-y': 'auto',
	    	'max-height': $(window).height()*0.7
	    });
	    
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
			headers.eq(i).data('order', '');
		}
        for(var i=0; i<headers.length; i++){
            var header = headers.eq(i);
            header.on("click", {id: i, header:header}, function(e){
                var arr = [];
                var rows = $("#table_it tr:gt(0)");
                for(var j=0; j<rows.length; j++){
                	rows.eq(j).data('index', j+1);
                    arr[j] = rows.eq(j);
                }
                
                if(e.data.header.text() != "Number    " && e.data.header.text() != "Transport Modes    "){ 
                	if(e.data.header.data('order') == '' || e.data.header.data('order') == 'asc'){
		                arr.sort(function(row1, row2){
		                    n1 = row1.children().eq(e.data.id).text();
		                    n2 = row2.children().eq(e.data.id).text();
		                    if($.isNumeric(n1)){
		                    	n1 = parseFloat(n1);
		                    	n2 = parseFloat(n2);
		                    	return n1-n2;
		                    }
		                    else if(e.data.header.text() === "Duration (hh:mm)      " || e.data.header.text() === "Elapse Time (hh:mm)   "
		                    	|| e.data.header.text() === "Travel Time (hh:mm)      " || e.data.header.text() === "Operational Time (hh:mm)      "
		                    	|| e.data.header.text() === "Waiting Time (hh:mm)      "){
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
		                });
		                e.data.header.data('order', 'desc');
		                e.data.header.children().last().attr('src', 'images/arrow-up.png');
                	}
                	else if(e.data.header.data('order') == 'desc'){
                		arr.sort(function(row1, row2){
		                    n1 = row1.children().eq(e.data.id).text();
		                    n2 = row2.children().eq(e.data.id).text();
		                    if($.isNumeric(n1)){
		                    	n1 = parseFloat(n1);
		                    	n2 = parseFloat(n2);
		                    	return n2-n1;
		                    }
		                    else if(e.data.header.text() === "Duration (hh:mm)      " || e.data.header.text() === "Elapse Time (hh:mm)   "
		                    	|| e.data.header.text() === "Travel Time (hh:mm)      " || e.data.header.text() === "Operational Time (hh:mm)      "
			                    || e.data.header.text() === "Waiting Time (hh:mm)      "){
								var time1 = n1.split(/hrs,|mins/);
								time1[0] = parseFloat(time1[0]);
								time1[1] = parseFloat(time1[1]);
								var time2 = n2.split(/hrs,|mins/);
								time2[0] = parseFloat(time2[0]);
								time2[1] = parseFloat(time2[1]);						
								if(time1[0] < time2[0])
									return 1;
								else if(time1[0] > time2[0])
									return -1;
								else{
									if(time1[1] < time2[1])
										return 1;
									else if(time1[1] > time2[1])
										return -1;
									else 
										return 0;
								}
							}
		                });
                		e.data.header.data('order', 'asc');
                		e.data.header.children().last().attr('src', 'images/arrow-down.png');
                	}
                	
                	var accordion = $('#planner-itinWidget-itinsAccord').children();
	                var h3View = [];
	                var divView = [];
	                for(var k=2; k<accordion.length; k++){
	                	if(k % 2 == 0){
	                		h3View[k/2] = accordion.eq(k);
	                	}
	                	else{
	                		divView[parseInt(k/2)] = accordion.eq(k);
	                	}
	                }
	                
	                for(var j=0; j<arr.length; j++){
	                    $("#table_it").append(arr[j]);
	                    arr[j].children().eq(0).text(j+1);
	                    
	                    var index = arr[j].data('index');
	                    $('#planner-itinWidget-itinsAccord').append(h3View[index]);
	                    $('#planner-itinWidget-itinsAccord').append(divView[index]);
	                    h3View[index].find('.otp-itinsAccord-header-number').eq(0).text(j+1);
	                    if(h3View[index].find('.otp-itinsAccord-header-number').eq(1) != null){
	                    	h3View[index].find('.otp-itinsAccord-header-number').eq(1).text(j+1+0.1);
	                    	h3View[index].find('.otp-itinsAccord-header-number').eq(2).text(j+1+0.2);
	                    }
	                }
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
			if(this.module.webapp.loginWidget != null && this.module.webapp.loginWidget.logged_in){
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
            heightStyle: "content"
        });

        // headers must be rendered after accordion is laid out to work around chrome layout bug
        /*for(var i=0; i<this.itineraries.length; i++) {
            var header = $("#"+divId+'-headerContent-'+i);
            this.renderHeaderContent(itineraries[i], i, header);
        }*/
        this.renderHeadersPHUONG();
        this_.itinsAccord.accordion("resize");

        var delay = function(){
        	var time = 0;
        	return function(callback, ms){
        		clearTimeout(time);
        		time = setTimeout(callback, ms);
        	}
        }();
        
        this.$().resize(function(){
        	delay(function(){
                this_.itinsAccord.accordion("resize");
                this_.renderHeadersPHUONG();
        	}, 1000)
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

   	
   	//Shuai (24-05-2017) new Renderer for multi-destination
   	//Shuai (19-03-2018) we also take into account the capacity issue. We apply capacity calculation also on multi-destination scenario.
   	renderHeaderContent : function(itin, index, parentDiv) {

   		//prepare data for multi-destination
   		var nLine = 0;
   		var nDest = 1;
   		var destId = [];
   		var destName = [];
   		var isCommon = [];
   		var prev = [];
   		var intermediateDestList = [];
   		
   		var hasCommonForAll = false;
   		
   		if('otherEndNameStr' in itin.tripPlan.queryParams)
   			nDest = itin.tripPlan.queryParams.otherEndNameStr.split('---').length + 1;
   		
   		//Shuai (24-05-2017)
    	//Mapping(destId -> leg) to check if there is any destination which ends at an intermediate leg. 
   		if('otherEndNameStr' in itin.tripPlan.queryParams)
   			this.loadIntermediateDestIdMapping(itin, intermediateDestList);
//   		console.log(intermediateDestList);
   		
   		this.loadItinerariesData(itin, destId, destName, isCommon, prev, 0, intermediateDestList);
   		
    	nLine = destId.length;
    	if(destId[0].split('-').length == nDest)
    		hasCommonForAll = true;

//    	console.log(hasCommonForAll);
    	
    	//add one dummy line in front of destId in case of no common part
    	if(!hasCommonForAll && nLine>1){
    		destId.unshift('dummy');
    		nLine += 1;
    	}
    	
    	//check if capacity considered in these itineraries 
    	//hasCapacity=true means capacity is considered and there exists splitted leg
    	var hasCapacity = false;
    	//hasCapacityForDestId maps the situation of capacity for each destination
    	var hasCapacityForMultiDestId = [];
//    	console.log("capacity request");
//    	console.log('capacityRequest' in itin.tripPlan.queryParams && itin.tripPlan.queryParams.capacityRequest != '');
    	if('capacityRequest' in itin.tripPlan.queryParams && itin.tripPlan.queryParams.capacityRequest != ''){
    		//check if there are splitted legs in result
    		for(var i=0; i < itin.itinData.legs.length; i++){
//    			console.log(itin.itinData.legs[i].capacityId);
    			if(itin.itinData.legs[i].capacityId > 1){
    	    		hasCapacity = true;
    	    		hasCapacityForMultiDestId[itin.itinData.legs[i].destinationId] = true;
    			}
    		}
    	}
    	//records the status of each line (concerning the destId and capacityId). only used in multi-dest with capacity
    	var lineStatus = [];
    	
//    	if(itin == this.itineraries[3]){
//    		console.log('');
//	    	console.log(destId);
//	    	console.log(destName);
//	    	console.log(isCommon);
//	    	console.log(prev);
//	    	console.log(nLine);
//	    	console.log(hasCapacityForMultiDestId);
//    	}
    	
    	//start rendering
   		parentDiv.empty();
   		
   		var divs = [];
   		
   		divs[0] = $('<div style="position: relative; height: 20px; margin-top: 5px;"></div>').appendTo(parentDiv);;
    	divs[0].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(index+1)+'.</div>');
   	 	   		
   		var maxSpan = itin.tripPlan.latestEndTime - itin.tripPlan.earliestStartTime;
	    var timeWidth = 32;
	    var startPx = 20+timeWidth, endPx = divs[0].width()-timeWidth - (itin.groupSize ? 48 : 0);
        var pxSpan = endPx-startPx;
        
        console.log("nLine = " + nLine);
        if(nLine == 1){
        	if(hasCapacity){
        		console.log("single dest + capacity");
            	//single-destination with capacity
            	//so far, the splitted legs (due to exceeded containers) must be merged together so we have at most 2 lines. Remark:The first and the last leg can be splitted. 
            	//TODO In the next version, we may use the similar structure as multi-destination for the capacity calculation and visualization
            	
            	//1st line: add timeStr for start and end 
            	var startTime = this.getStartEndTimeForCapacityId(itin, 1, 'start');
    	    	var endTime = this.getStartEndTimeForCapacityId(itin, 1, 'end');
            	var itinSpan = endTime - startTime;
            	var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
            	var leftPx = startPx + startPct * pxSpan;
                var widthPx = pxSpan * (itinSpan / maxSpan);
    	    	
//                console.log(itin.itinData.legs[0].endTime + ' ' + endTime);
//                console.log( otp.util.Time.formatItinTime(itin.itinData.legs[0].endTime, otp.config.locale.time.time_format)+ ' '+ otp.util.Time.formatItinTime(endTime+10000000, otp.config.locale.time.time_format));
            	var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
                divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
                var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
                divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr + '</div>');
            	
            	//2nd line
    			divs[1] = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
    	      	divs[1].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(''+ (index+1) +'.'+ 1 )+'.</div>');
    	      	
            	var startTime = this.getStartEndTimeForCapacityId(itin, 2, 'start');
    	    	var endTime = this.getStartEndTimeForCapacityId(itin, 2, 'end');
            	var itinSpan = endTime - startTime;
            	var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
            	var leftPx = startPx + startPct * pxSpan;
                var widthPx = pxSpan * (itinSpan / maxSpan);
    	    	        	
    	      	//check if the 1st and last legs are splitted, thus add timeStr accordingly.
                var firstLeg=null, lastLeg=null;
                for(var i=0; i < itin.itinData.legs.length; i++){
                	var temp = itin.itinData.legs[i];
                	if(temp.capacityId == 2){
                		if(firstLeg == null)
                			firstLeg = temp;
                		else if((temp.startTime - temp.boarding *1000) < (firstLeg.startTime - firstLeg.boarding *1000))
                			firstLeg = temp;
    	    			
                		if(lastLeg == null)
                			lastLeg = temp;
                		else if((temp.endTime + temp.alighting *1000) > (lastLeg.endTime + lastLeg.alighting *1000))
                			lastLeg = temp;
    	    		}
                }
                if(firstLeg.prevCapacityId == 0){
                    var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
                    divs[1].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
                }
                if(lastLeg.nextCapacityId == 0){
                    var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
                    divs[1].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr + '</div>');
                }
        	}
        	else{
        		console.log("single dest without capacity");
	        	//single-destination without capacity
		    	var startTime = itin.getStartTime();
		    	var endTime = itin.getEndTime();
	        	var itinSpan = endTime - startTime;
	        	var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	        	var leftPx = startPx + startPct * pxSpan;
	            var widthPx = pxSpan * (itinSpan / maxSpan);
		    	
//	            console.log(itin.itinData.legs[0].endTime + ' ' + endTime);
//	            console.log( otp.util.Time.formatItinTime(itin.itinData.legs[0].endTime, otp.config.locale.time.time_format)+ ' '+ otp.util.Time.formatItinTime(endTime+10000000, otp.config.locale.time.time_format));
	            
	        	var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
	            divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
	            var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
	            divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr + '</div>');
        	}
        }
        else{
        	if(hasCapacity){
        		console.log("multi-dest with capacity");
        		if(hasCommonForAll){
        			lineStatus[0] = destId[0] + '_' + 1;
        			
	        		var startTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'start', 1);
	        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	        		var leftPx = startPx + startPct * pxSpan;
	        		var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
		            divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
		           
		            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'end', 1);
		            var itinSpan = endTime - startTime;
	        		var widthPx = pxSpan * (itinSpan / maxSpan);
		            var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
		            divs[0].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[0]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + destName[destId[0]] + '</div>');

//		            console.log(destId[0]);
//		            console.log(hasCapacityForMultiDestId)
//		            console.log(hasCapacityForMultiDestId[destId[0]]);
		            if(hasCapacityForMultiDestId[destId[0]]){
		            	divs[1] = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
		            	divs[1].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(''+(index+1)+'.1')+'.</div>');
		            	lineStatus[1] = destId[0] + '_' + 2;
		            	
		            	var startTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'start', 2);
		        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
		        		var leftPx = startPx + startPct * pxSpan;
		        		var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);

		        		//check if the 1st is splitted, thus add timeStr.
		                var firstLeg = null, lastLeg = null;
		                for(var i=0; i < itin.itinData.legs.length; i++){
		                	var temp = itin.itinData.legs[i];
		                	if(temp.capacityId == 2 && temp.destinationId == destId[0]){
		                		if(firstLeg == null)
		                			firstLeg = temp;
		                		else if((temp.startTime - temp.boarding *1000) < (firstLeg.startTime - firstLeg.boarding *1000))
		                			firstLeg = temp;
		    	    		}
		                	if(temp.capacityId == 2 && temp.destinationId == destId[0]){
		                		if(lastLeg == null)
		                			lastLeg = temp;
		                		else if((temp.endTime + temp.alighting *1000) > (lastLeg.endTime + lastLeg.alighting *1000))
		                			lastLeg = temp;
		    	    		}
		                }
		                if(firstLeg.prevCapacityId == 0){
		                    var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
		                    divs[1].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
		                }
		                
		                //do not print end label if the last leg of line2 is merged before end 
		                if(lastLeg.nextCapacityId == 0){
				            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'end', 2);
				            var itinSpan = endTime - startTime;
			        		var widthPx = pxSpan * (itinSpan / maxSpan);
				            var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
				            var str = destName[destId[0]];
		        			//in case there is any destination arrival, modify the string
		        			if(destName[destId[0]].includes(':')){
		        				str = timeStr + ':' + destName[destId[0]].split(':')[2];
		        			}
				            divs[1].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[0]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + str/*destName[destId[0]]*/ + '</div>');
		                }
		            }
        		}
        		//TODO if necessary
//        		else{
//        			console.log("there are no common parts");
//        		}
        		
        		for(var i=1; i < nLine; i++){
//        			console.log(divs.length);
        			var newLine = divs.length;
        			divs[newLine] = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
        			
        			var indexStr = divs[newLine-1].children('.otp-itinsAccord-header-number')[0].innerHTML.split('.')[1];
        			if(hasCapacityForMultiDestId[destId[i]]){
	        			if(indexStr == '' || indexStr == null)
	        				indexStr = '1.1';
	        			else
	        				indexStr = parseInt(indexStr) + 1 + '.1';
        			}
        			else{
        				if(indexStr == '' || indexStr == null)
        					indexStr = '1';
        				else
        					indexStr = parseInt(indexStr) + 1;
        			}
	    	      	divs[newLine].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(''+(index+1)+'.'+ indexStr)+'.</div>');
	    	      	lineStatus[newLine] = destId[i] + '_' + 1;
	    	      	
	    	      	var startTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'start', 1);
		            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'end', 1);
	        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	        		var leftPx = startPx + startPct * pxSpan;
	        		var itinSpan = endTime - startTime;
	        		var widthPx = pxSpan * (itinSpan / maxSpan);
	        		
	        		if(isCommon[destId[i]]){
	    	      		divs[newLine].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[i]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + destName[destId[i]] + '</div>');
	    	      	}
	    	      	else{
	    	      		var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
		                divs[newLine].append('<div class="otp-itinsAccord-header-time" style="width:' + ((this.getDestName(itin, destId[i]).length + timeStr.length) * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + timeStr + ':' + this.getDestName(itin, destId[i]) + '</div>');
	    	      	}
	        		
	        		//add one additional line if there exists splitted route for destsId[i]
	        		if(hasCapacityForMultiDestId[destId[i]]){
//	        			console.log(divs.length);
	        			var newLine = divs.length;
	        			divs[newLine] = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);	        			
		    	      	divs[newLine].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(''+(index+1)+'.'+ indexStr.slice(0, -1) +'2')+'.</div>');
	        			lineStatus[newLine] = destId[i] + '_' + 2;
	        			
		    	      	var startTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'start', 2);
			            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'end', 2);
		        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
		        		var leftPx = startPx + startPct * pxSpan;
		        		var itinSpan = endTime - startTime;
		        		var widthPx = pxSpan * (itinSpan / maxSpan);
		        		
		        		//do not print label if the last leg of line2 is merged before end 
		        		var lastLeg = null;
		        		for(var j=0; j < itin.itinData.legs.length; j++){
		                	var temp = itin.itinData.legs[j];
		                	if(temp.capacityId == 2 && temp.destinationId == destId[i]){
		                		if(lastLeg == null)
		                			lastLeg = temp;
		                		else if((temp.endTime + temp.alighting *1000) > (lastLeg.endTime + lastLeg.alighting *1000))
		                			lastLeg = temp;
		    	    		}
		                }
		        		if(lastLeg.nextCapacityId == 0){
			        		if(isCommon[destId[i]]){
			        			var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
			        			var str = destName[destId[i]];
			        			//in case there is any destination arrival, modify the string
			        			if(destName[destId[i]].includes(':')){
			        				str = timeStr + ':' + destName[destId[i]].split(':')[2];
			        			}
			    	      		divs[newLine].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[i]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + str/*destName[destId[i]]*/ + '</div>');
			    	      	}
			    	      	else{
			    	      		var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
				                divs[newLine].append('<div class="otp-itinsAccord-header-time" style="width:' + ((this.getDestName(itin, destId[i]).length + timeStr.length) * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + timeStr + ':' + this.getDestName(itin, destId[i]) + '</div>');
			    	      	}
		        		}
	        		}
        		}
        	}
        	else{
        		console.log("multi-dest without capacity");
	        	//multi-destination without capacity
	        	if(hasCommonForAll){
	//        		var startTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'start', 1);
	        		var startTime = itin.getStartTime();
	        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	        		var leftPx = startPx + startPct * pxSpan;
	        		var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
		            divs[0].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
		            		           
		            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[0], 'end', 1);
	//	            var endTime = itin.getEndTime();
		            var itinSpan = endTime - startTime;
	        		var widthPx = pxSpan * (itinSpan / maxSpan);
		            var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
		            console.log(timeStr + ' '+destName[destId[0]]);
		            divs[0].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[0]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + destName[destId[0]] + '</div>');
	        	}
	//        	else{
	//        		console.log("there are no common parts");
	//        		var startTime = itin.itinData.legs[0].startTime;
	//        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	//        		var leftPx = startPx + startPct * pxSpan;
	//        		divs[0].append('<div style="position: relative; width: 150px; left: '+(leftPx-32)+'px;">No Common Parts</div>');
	//        	}
	        	
	        	for(var i=1; i < nLine; i++){
	    			divs[i] = $('<div style="position: relative; height: 20px; margin-top: 5px"></div>').appendTo(parentDiv);
	    	      	divs[i].append('<div class="otp-itinsAccord-header-number" style="font-size: 1em">'+(''+(index+1)+'.'+i)+'.</div>');
	    	      	
	    	      	var startTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'start', 1);
		            var endTime = this.getStartEndTimeForMultiDestId(itin, destId[i], 'end', 1);
	        		var startPct = (startTime - itin.tripPlan.earliestStartTime) / maxSpan;
	        		var leftPx = startPx + startPct * pxSpan;
	        		var itinSpan = endTime - startTime;
	        		var widthPx = pxSpan * (itinSpan / maxSpan);
	        		
	//        		if(hasCommonForAll){
	//	        		if(prev[destId[i]] == '0'){
	//	        			var timeStr = otp.util.Time.formatItinTime(startTime, otp.config.locale.time.time_format);
	//		        		divs[i].append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');
	//	        		}
	//        		}
	        		
	    	      	if(isCommon[destId[i]]){
	    	      		divs[i].append('<div class="otp-itinsAccord-header-time" style="width:' + (destName[destId[i]].length * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + destName[destId[i]] + '</div>');
	    	      	}
	    	      	else{
	    	      		var timeStr = otp.util.Time.formatItinTime(endTime, otp.config.locale.time.time_format);
		                divs[i].append('<div class="otp-itinsAccord-header-time" style="width:' + ((this.getDestName(itin, destId[i]).length + timeStr.length) * 8) + 'px; left: '+(leftPx+widthPx+2)+'px;">' + timeStr + ':' + this.getDestName(itin, destId[i]) + '</div>');
	    	      	}
	    		}
        	}
        }

        for(var l=0; l<itin.itinData.legs.length; l++) {
        	var leg = itin.itinData.legs[l];
        	
        	var startPct = (leg.startTime - itin.tripPlan.earliestStartTime) / maxSpan;
        	var endPct = (leg.endTime - itin.tripPlan.earliestStartTime) / maxSpan;
        	var leftPx = startPx + startPct * pxSpan + 1;
        	var widthPx = pxSpan * (leg.endTime - leg.startTime) / maxSpan - 1;            
          
        	var showRouteLabel = widthPx > 40 && otp.util.Itin.isTransit(leg.mode) && leg.routeShortName && leg.routeShortName.length <= 6;
        	var segment = $('<div class="otp-itinsAccord-header-segment" />')
        	.css({
        		width: widthPx,
        		left: leftPx,
        		background: this.getModeColor(leg.mode)+' url('+otp.config.resourcePath+'images/mode/'+leg.mode.toLowerCase()+'.png) center no-repeat',
        		//opacity: 0.7
        	})
        	segment.data({'id': leg.id});
        	if(showRouteLabel) segment.append('<div style="margin-left:'+(widthPx/2+9)+'px;">'+leg.routeShortName+'</div>');
        	
          //TODO possible operations on legs for future work
//	        segment.hover(function(){
//	        	$(this).css('opacity', 1);
//	        }, function(){
//	        	$(this).css('opacity', 0.7);
//	        });
//	        segment.on('click', function(event){
//	        	console.log(event);
//	        	console.log('segment');
//	        });
        	
        	//put segments into the corresponding line
//        	var indexOfLine;
        	if(nLine > 1){
        		//multi-destination
        		if(hasCapacity){
        			for(var i=0; i < lineStatus.length; i++){
        				var status = lineStatus[i].split('_');
//        				console.log(status);
//        				console.log(leg.destinationId + '  ' + leg.capacityId);
        				if(leg.destinationId == status[0] && leg.capacityId == status[1]){
        					segment.appendTo(divs[i]);
//        					indexOfLine = i;
//        					console.log('line number:' + indexOfLine);
        					break;
        				}
        			}
        		}
        		else{
	        		for(var i=0; i < nLine; i++){
	        			if(leg.destinationId == destId[i]){
	        				segment.appendTo(divs[i]);
	        				break;
	        			}
	        		}
        		}
        	}
        	else{
            	if(hasCapacity){
            		//put segment according to the capacity labels
            		segment.appendTo(divs[leg.capacityId -1]);
            	}
            	else
            		segment.appendTo(divs[0]);
        	}

        	//adding 'arrow' symbol to show the connections between legs in multi-destination scenario without capacity
        	if(nLine > 1 && leg.previousDestinationId != '0' && !hasCapacity){
        		//check if it is the first leg in this line
        		if(leg.startTime == this.getStartEndTimeForMultiDestId(itin, leg.destinationId, 'start', 1)){
//        			console.log(leg.destinationId + ':' + prev[leg.destinationId] + '=' + destId.indexOf(prev[leg.destinationId]));
//        			console.log(divs[destId.indexOf(prev[leg.destinationId])]);
        			var follow = divs[destId.indexOf(prev[leg.destinationId])].children('.otp-itinsAccord-header-segment').last();
        			var startArrow = parseFloat(follow.css('left').split('px')[0]) + parseFloat(follow.css('width').split('px')[0]) -10;
        			divs[destId.indexOf(leg.destinationId)].append('<div style="position: relative; width: 150px; left: '+ startArrow +'px;"><img src="images/arrow-right.png"/><div>');
        		}
        	}
        	
        	//add 'arrow' symbol to show split/merge legs in capacity scenario for single destination
        	if(nLine == 1 && leg.capacityId != 1 && (leg.prevCapacityId != 0 || leg.nextCapacityId != 0)){
        		//if the leg is the splitted one
        		var leftArrow = null, rightArrow = null;
        		var segments = divs[0].children('.otp-itinsAccord-header-segment');
        		
        		for(var i=0; i < segments.length; i++){
        			var temp = $(segments[i]);
        			if(temp.data('id') == leg.prevCapacityId){
        				leftArrow = parseFloat(temp.css('left').split('px')[0]) + parseFloat(temp.css('width').split('px')[0]) -10;
                		divs[1].append('<div style="position: absolute; width: 50px; left: '+ leftArrow +'px;"><img src="images/arrow-down2.png"/><div>');

                		if(rightArrow == null)
                			continue;
                		else
                			break;
        			}
        			if(temp.data('id') == leg.nextCapacityId){
        				rightArrow = parseFloat(temp.css('left').split('px')[0]) -10;
                		divs[1].append('<div style="position: absolute; width: 50px; left: '+ rightArrow +'px;"><img src="images/arrow-up2.png"/><div>');
        				
                		if(leftArrow == null)
                			continue;
                		else
                			break;
        			}
        		}
        	}
        }

        //All the splitted legs are at the end of the leg-list. So add the arrows after the rendering of all the leg segments. (only for multi-destination with capacity)
        for(var l=0; l<itin.itinData.legs.length; l++) {
        	var leg = itin.itinData.legs[l];
        	
        	var lineNum = lineStatus.indexOf(leg.destinationId + '_' + leg.capacityId); //note the line where the arrow is going to be inserted
        	//multi-destination with capacity
        	if(nLine > 1 && hasCapacity){
        		if(leg.previousDestinationId != '0' && leg.startTime == this.getStartEndTimeForMultiDestId(itin, leg.destinationId, 'start', 1)){
        			var follow;
        			var prevLineNum = lineStatus.indexOf(prev[leg.destinationId] + '_1'); //note the line to follow
        			//find out the last arrival time of previous line
        			if(this.getStartEndTimeForMultiDestId(itin, prev[leg.destinationId], 'end', 2) != null){
        				if(this.getStartEndTimeForMultiDestId(itin, prev[leg.destinationId], 'end', 1) < this.getStartEndTimeForMultiDestId(itin, prev[leg.destinationId], 'end', 2))
        					follow = divs[prevLineNum+1].children('.otp-itinsAccord-header-segment').last();
        				else
        					follow = divs[prevLineNum].children('.otp-itinsAccord-header-segment').last();
        			}
        			else
        				follow = divs[prevLineNum].children('.otp-itinsAccord-header-segment').last();
//        			console.log(follow);
        			var startArrow = parseFloat(follow.css('left').split('px')[0]) + parseFloat(follow.css('width').split('px')[0]) -10;
        			divs[lineNum].append('<div style="position: relative; width: 150px; left: '+ startArrow +'px;"><img src="images/arrow-right.png"/><div>');
        		}
        		
        		if(leg.capacityId != 1 && (leg.prevCapacityId != 0 || leg.nextCapacityId != 0)){
        			//if the leg is the splitted one
            		var leftArrow = null, rightArrow = null;
            		var segments = divs[lineNum-1].children('.otp-itinsAccord-header-segment');
            		
            		for(var i=0; i < segments.length; i++){
            			var temp = $(segments[i]);
            			if(temp.data('id') == leg.prevCapacityId){
            				leftArrow = parseFloat(temp.css('left').split('px')[0]) + parseFloat(temp.css('width').split('px')[0]) -10;
                    		divs[lineNum].append('<div style="position: absolute; width: 50px; left: '+ leftArrow +'px;"><img src="images/arrow-down2.png"/><div>');

                    		if(rightArrow == null)
                    			continue;
                    		else
                    			break;
            			}
            			if(temp.data('id') == leg.nextCapacityId){
            				rightArrow = parseFloat(temp.css('left').split('px')[0]) -10;
                    		divs[lineNum].append('<div style="position: absolute; width: 50px; left: '+ rightArrow +'px;"><img src="images/arrow-up2.png"/><div>');
            				
                    		if(leftArrow == null)
                    			continue;
                    		else
                    			break;
            			}
            		}
        		}
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
				var cell2 = $("<th></th>").text("Quality       ").appendTo(row);
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
				var cell = $("<th></th>").text("      ").appendTo(row);
				var cell1 = $("<th></th>").text("Transport Modes    ").css('text-align', 'center').appendTo(row);
				var cell2 = $("<th></th>").text("Quality     ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				//var cell3 = $("<th></th>").text("Total cost (euros)     ").appendTo(row);
				var cell4 = $("<th></th>").text("Elapse Time (hh:mm)   ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				var cell5 = $("<th></th>").text("Emission CO2(kg)"      ).css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				var cell6 = $("<th></th>").text("Length (km)       ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				
				var cell7 = $("<th></th>").text("Total Cost (€)      ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				var cell8 = $("<th></th>").text("Stops   ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
//				var cell9 = $("<th></th>").text("Duration (hh:mm)      ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);

				var cell9_1 = $("<th></th>").text("Travel Time (hh:mm)      ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				var cell9_2 = $("<th></th>").text("Operational Time (hh:mm)      ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				var cell9_3 = $("<th></th>").text("Waiting Time (hh:mm)      ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);

				if(this.queryParams.riskAnalysis)
					var cell10 = $("<th></th>").text("Risk        ").css('text-align', 'center').append($('<img src="images/arrow-down.png">')).appendTo(row);
				
//				var cell11 = $("<th></th>").text("Dashboard        ").appendTo(row);
//				var cell12 = $("<th></th>").text("Benchmark        ").appendTo(row);
				
				table.append(row);
				for (var i=0; i<this.itineraries.length; i++) {
					var itin = this.itineraries[i];
					var row = $("<tr></tr>");
					var cell = $("<td></td>").text(i+1).css('text-align', 'center').appendTo(row);
					var cell1 = $("<td></td>").text(itin.getTransportMode()).css('text-align', 'center').appendTo(row);
					
				    //Shuai(10-05-2018) rework cell2: translate the quality of the itinerary to color indicator (e.g, Green-->yellow-->orange-->red)
//					var cell2 = $("<td></td>").text(itin.itinData.quality).css('text-align', 'center').appendTo(row);
//					console.log(itin.itinData.quality);
					var rank = Math.floor(itin.itinData.quality / this.gradientColors.length);
					if(itin.itinData.quality == 100)
						rank = 9;
//					console.log(rank);
//					console.log(this.gradientColors[rank]);
					var cell2 = $("<td></td>").append($('<button style="width:100%; color:transparent; background-color:'+ this.gradientColors[rank] +'">'+ itin.itinData.quality +'</button>')).appendTo(row);
					
					//var cell3 = $("<td></td>").text(itin.itinData.totalcost.toFixed(2)).appendTo(row);
					var cell4 = $("<td></td>").text(otp.util.Time.secsToHrMin(itin.itinData.elapsedTime)).css('text-align', 'center').appendTo(row);
					var cell5 = $("<td></td>").text(itin.itinData.CO2.toFixed(2)).css('text-align', 'center').appendTo(row);
					var cell6 = $("<td></td>").text(itin.itinData.distance.toFixed(2)).css('text-align', 'center').appendTo(row);
					
					var cell7 = $("<td></td>").text(itin.itinData.totalcost.toFixed(2)).css('text-align', 'center').appendTo(row);
					var cell8 = $("<td></td>").text(itin.getTransfers()).css('text-align', 'center').appendTo(row);
//					var cell9 = $("<td></td>").text(itin.getDurationStr()).css('text-align', 'center').appendTo(row);
					
					//traval/operational/waiting time
					var cell9_1 = $("<td></td>").text(otp.util.Time.secsToHrMin(itin.itinData.travelTime)).css('text-align', 'center').appendTo(row);
					var cell9_2 = $("<td></td>").text(otp.util.Time.secsToHrMin(itin.itinData.operationalTime)).css('text-align', 'center').appendTo(row);
					var cell9_3 = $("<td></td>").text(otp.util.Time.secsToHrMin(itin.itinData.waitingTime)).css('text-align', 'center').appendTo(row);
					
					if(this_.queryParams.riskAnalysis){
						
						//show average risk value instead of "Details"
						var KRIs = itin.itinData.KRIs;
	//					console.log(KRIs);
						var flexibility = 100-KRIs.flexibility*60*100/KRIs.duration;
						var avg = flexibility*this_.queryParams.KRI_flexibility_w + KRIs.timeRating*this_.queryParams.KRI_time_w +KRIs.safety*this_.queryParams.KRI_safety_w + KRIs.costRating*this_.queryParams.KRI_cost_w;
	      			//	var avg = (flexibility + KRIs.timeRating + KRIs.safety + KRIs.costRating)/4;
						var value = 100 - avg;
						if (value < 0)
							value = 0;
						console.log(value);
						value = value.toFixed(2);
						//change the color of the button according to the return value
						/*EDIT-Yuanyuan(26/06/2018): modify the color shown according to the average number value*/
						// var num = checkQuality(this_.itineraries[i]);
						var color = '#61c85f';
						if (value >= 3 && value < 6)
							color = 'orange';
						if (value >= 6)
							color = '#c93838';
						/*yuanyuan(15-06-2018) add a button to show the risk value with 100-avg*/
						/*yuanyuan(08-03-2017) add a button to show the risk with a bar chart*/
						var riskButton = $('<button id="buttonRisk' + itin.itinData.id + '" style="background-color:'+color+'" >' + value + '</button>');
						var cell10 = $("<td></td>").appendTo(row);
						riskButton.appendTo(cell10);
					}
					
//					var cell11 = $("<td></td>").append($('<img src="images/arrow-down.png">')).appendTo(row);
//					var cell12 = $("<td></td>").append($('<img src="images/arrow-down.png">')).appendTo(row);
					
					cell4.css('background', '#8cc4ff');
					cell5.css('background', '#ffb2b2');
					cell6.css('background', '#bbe070');
					
					//Shuai (04-04-2017) highlight the preferred trip
					if(this.module.webapp.loginWidget != null && this.module.webapp.loginWidget.logged_in){
						if(itin.itinData.fromDatabase == true){
							row.children().css('color', 'Violet');
						}
					}
					//End Shuai
				
					table.append(row);
				}
				
				itinDiv.append(table);
				
				/*Yuanyuan 8/4/2017 Add the chart associated with the button to show risk*/
				// allocate space
				var countClicks = 0;
				
			// creating the array store each index of the itineraries
			// var a=[],b=this.itineraries.length;while(b--)a[b]=b+1;
			this.itineraries.forEach(function (i) {
				var KRIs = i.itinData.KRIs;
				var buttonId = "#buttonRisk" + i.itinData.id;
				//$(document).on('click', '#buttonRisk', function() {
				$(document).on('click', buttonId, function() {
					// alert();
					countClicks++;
					if(countClicks==1) {
						itinDiv.append('<div id="chartContainer"  style="height: 300px; width: 60%; float: left"></div>');
						itinDiv.append('<div id="sideChart1" style="height: 300px; width: 40%; float: right"></div>');
//						itinDiv.append('<div id="sideChart2" style="height: 150px; width: 40%;  float: right"></div>');
//						$("#sideChart2").append('<div id="riskTriangleId" class="otp-riskTriangle notDraggable"></div>');
//						$("#sideChart2").append('<input type="button" value="reset" style="margin-left:30px" id="riskTriangleReset"></input>');
//						riskTriangle = new otp.widgets.RiskTrianglePanel("riskTriangleId");
					}
					createChart(KRIs);
					
					var flexibility = 100-KRIs.flexibility*60*100/KRIs.duration; 
					var lowerTime = 100-KRIs.maxTime*60*100/KRIs.duration;
					var lowerF = 100-KRIs.maxFlexibility*60*100/KRIs.duration;	
					var upperF = 100-KRIs.minFlexibility*60*100/KRIs.duration;
					var upperTime = 100-KRIs.minTime*60*100/KRIs.duration;
					var upperCost = 100-100*KRIs.minCost/KRIs.totalCost;
					var lowerCost = 100-100*KRIs.maxCost/KRIs.totalCost;
					
					var avg = flexibility*this_.queryParams.KRI_flexibility_w + KRIs.timeRating*this_.queryParams.KRI_time_w +KRIs.safety*this_.queryParams.KRI_safety_w + KRIs.costRating*this_.queryParams.KRI_cost_w;
					var lowerAvg = lowerF*this_.queryParams.KRI_flexibility_w + lowerTime*this_.queryParams.KRI_time_w +KRIs.safety*this_.queryParams.KRI_safety_w + lowerCost*this_.queryParams.KRI_cost_w;
					var upperAvg = upperF*this_.queryParams.KRI_flexibility_w + upperTime*this_.queryParams.KRI_time_w +KRIs.safety*this_.queryParams.KRI_safety_w + upperCost*this_.queryParams.KRI_cost_w;
					var errorAvg = (upperAvg - lowerAvg)/2;
					// console.log(avg);
					createSide1Chart(avg.toFixed(2), lowerAvg.toFixed(2), upperAvg.toFixed(2), errorAvg.toFixed(2));
					
//					riskTriangle.onChanged = function() {
//						var formData = riskTriangle.getFormData();
//						var avg = flexibility*formData.flexibility_w + KRIs.timeRating*formData.time_w +KRIs.safety*formData.safety_w + KRIs.costRating*formData.cost_w;
//						var lowerAvg = lowerF*formData.flexibility_w + lowerTime*formData.time_w +KRIs.safety*formData.safety_w + lowerCost*formData.cost_w;
//						var upperAvg = upperF*formData.flexibility_w + upperTime*formData.time_w +KRIs.safety*formData.safety_w + upperCost*formData.cost_w;
//						var errorAvg = (upperAvg - lowerAvg)/2;
//						// console.log(avg);
//						createSide1Chart(avg.toFixed(2), lowerAvg.toFixed(2), upperAvg.toFixed(2), errorAvg.toFixed(2));
//					}
//					$("#riskTriangleReset").on("click", function(){
//			        	riskTriangle.setValues(0.25, 0.25, 0.25, 0.25);
//			        	var avg = flexibility*0.25 + KRIs.timeRating*0.25 +KRIs.safety*0.25 + KRIs.costRating*0.25;
//						var lowerAvg = lowerF*0.25 + lowerTime*0.25 +KRIs.safety*0.25 + lowerCost*0.25;
//						var upperAvg = upperF*0.25 + upperTime*0.25 +KRIs.safety*0.25 + upperCost*0.25;
//						var errorAvg = (upperAvg - lowerAvg)/2;
//						createSide1Chart(avg.toFixed(2), lowerAvg.toFixed(2), upperAvg.toFixed(2), errorAvg.toFixed(2));     	
//			        })
				});
			  });
		    
			
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
//                    headerHtml += "("+leg.route+") "; //PHUONG: route_short_name in route.txt of GTFS
                }
                if (leg.routeLongName) {
//                    headerHtml += leg.routeLongName;
                }
                
                headerHtml += leg.from.name + " - " + leg.to.name;
                
                if(leg.mode == "FERRY"){
                	headerHtml += ' (' + leg.routeShortName + ')';
                }
                
                if(leg.headsign) {
                    /*TRANSLATORS: used in sentence like: <Long name of public transport route> "to" <Public transport
                    headsign>. Used in showing itinerary*/
                    //(Shuai 02-05-2018)remove headsign because we use headsign to store some other data
//                    headerHtml +=  pgettext("bus_direction", " to ") + leg.headsign;
                }
				
				/*headerHtml += " CO2: "+leg.CO2.toFixed(2) +" kg; ";
				headerHtml += " cCO2: "+leg.costCO2.toFixed(2) +" euros; ";
				headerHtml += " Dist: "+(leg.distance/1000).toFixed(2) + " km";
				headerHtml += " cDist: "+(leg.costdistance).toFixed(2) + " euros";
				headerHtml += " cTime: "+(leg.costtime).toFixed(2) + " euros";
				headerHtml += " TC: "+leg.totalcost.toFixed(2) +" euros; ";*/
				
				headerHtml += " [Cost: "+leg.totalcost.toFixed(2) +" euros; ";
//				headerHtml += "Duration: "+otp.util.Time.secsToHrMin(leg.duration) + " h; ";
				headerHtml += "Emission CO2: "+leg.CO2.toFixed(2) +" kg; ";
				headerHtml += "Length: "+(leg.distance/1000).toFixed(2) + " km; ";
				headerHtml += "Travel Time: "+ otp.util.Time.secsToHrMin(leg.duration) + " h; ";
				headerHtml += "Operational Time: "+ otp.util.Time.secsToHrMin(leg.boarding + leg.alighting) + " h; ";
				headerHtml += "Waiting Time: "+ otp.util.Time.secsToHrMin(leg.waiting) + " h; ";
				
				if(queryParams.capacityRequest != null && queryParams.capacityRequest != '' && parseInt(queryParams.capacityRequest) > 0)
					headerHtml += "Number of Container: " + leg.assignedcontainers;
				else
					headerHtml += "Number of Container: 1";
				headerHtml += "]";
				
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
                //Shuai (07-06-2018) start with all collapsed
                active: /*otp.util.Itin.isTransit(leg.mode) ? 0 : */false,
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
//        console.log("startTime: " + itin.getStartTimeStr());
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

        	tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Itinerary") + '</div><div class="otp-itinTripSummaryText">Cost: '+itin.itinData.totalcost.toFixed(2) + " euros; " +
        			"Emission CO2: " + itin.itinData.CO2.toFixed(2) + " kg; Length: " + itin.itinData.distance.toFixed(2)+ " km; Travel Time: " + otp.util.Time.secsToHrMin(itin.itinData.travelTime)
        			+ " h; Operational Time: " + otp.util.Time.secsToHrMin(itin.itinData.operationalTime) + " h; Waiting Time: " + otp.util.Time.secsToHrMin(itin.itinData.waitingTime)+ ' h</div>');
        	
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Cost") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost.toFixed(2) + " euros" + '</div>');			
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Duration") + '</div><div class="otp-itinTripSummaryText">'+itin.getDurationStr()+'</div>');
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("CO2") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.CO2.toFixed(2) + " kg" + '</div>');
//		 	tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Distance") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.distance.toFixed(2)+ " km" + '</div>');
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("CostM") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.totalcost_multiobjective.toFixed(2) + " euros" + '</div>');
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("WAIT1") + '</div><div class="otp-itinTripSummaryText">'+itin.itinData.WAIT1.toFixed(2) + " euros; wait2 = " + itin.itinData.WAIT2.toFixed(2) + "; wait3 = " + itin.itinData.WAIT3.toFixed(2) +  '</div>');
			
			//tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Summary for each transport mode") + '</div><div class="otp-itinTripSummaryText">'+": "+'</div>');
			var durationShip = 0, durationTrain = 0, durationTruck = 0, operationalShip = 0, operationalTrain = 0, operationalTruck = 0;
			var waitingShip = 0, waitingTrain = 0, waitingTruck = 0;
			for(var i=0; i<itin.itinData.legs.length; i++){
				var leg = itin.itinData.legs[i];
				if(leg.mode == 'FERRY'){
					durationShip += leg.endTime - leg.startTime;
					operationalShip += leg.boarding + leg.alighting;
					waitingShip += leg.waiting;
				}
				else if(leg.mode == 'RAIL'){
					durationTrain += leg.endTime - leg.startTime;
					operationalTrain += leg.boarding + leg.alighting;
					waitingTrain += leg.waiting;
				}
				else if(leg.mode == 'BUS'){
					durationTruck += leg.endTime - leg.startTime;
					operationalTruck += leg.boarding + leg.alighting;
					waitingTruck += leg.waiting;
				}
			}
			
			var costTimeAtStops = parseFloat(itin.itinData.totalcost);
			
		 	if (itin.itinData.CO2SHIP > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Ship mode") + '</div><div class="otp-itinTripSummaryText">'+"Cost: " 
						+ itin.itinData.totalcostSHIP.toFixed(2) + " euros; Emission CO2: " + itin.itinData.CO2SHIP.toFixed(2) + " kg; Length: " 
						+ (itin.itinData.distanceSHIP/1000).toFixed(2) + " km; Travel Time: " + otp.util.Time.secsToHrMin(durationShip/1000) 
						+ " h; Operational Time: " + otp.util.Time.secsToHrMin(operationalShip) + " h; Waiting Time: " + otp.util.Time.secsToHrMin(waitingShip) 
						+ " h" + '</div>');
				costTimeAtStops -= parseFloat(itin.itinData.totalcostSHIP);
			}
			if (itin.itinData.CO2TRAIN > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Rail mode") + '</div><div class="otp-itinTripSummaryText">'+"Cost: " 
						+ itin.itinData.totalcostTRAIN.toFixed(2) + " euros; Emission CO2: " + itin.itinData.CO2TRAIN.toFixed(2) + " kg; Length: " 
						+ (itin.itinData.distanceTRAIN/1000).toFixed(2) + " km; Travel Time: " + otp.util.Time.secsToHrMin(durationTrain/1000) 
						+ " h; Operational Time: " + otp.util.Time.secsToHrMin(operationalTrain) + " h; Waiting Time: " + otp.util.Time.secsToHrMin(waitingTrain) 
						+ " h" + '</div>');
				costTimeAtStops -= parseFloat(itin.itinData.totalcostTRAIN);
			}
			if (itin.itinData.CO2TRUCK > 0) 
			{
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Truck mode") + '</div><div class="otp-itinTripSummaryText">'+"Cost: " 
						+ itin.itinData.totalcostTRUCK.toFixed(2) + " euros; Emission CO2: " + itin.itinData.CO2TRUCK.toFixed(2) + " kg; Length: " 
						+ (itin.itinData.distanceTRUCK/1000).toFixed(2) + " km; Travel Time: " + otp.util.Time.secsToHrMin(durationTruck/1000) 
						+ " h; Operational Time: " + otp.util.Time.secsToHrMin(operationalTruck) + " h; Waiting Time: " + otp.util.Time.secsToHrMin(waitingTruck) 
						+ " h" + '</div>');
				costTimeAtStops -= parseFloat(itin.itinData.totalcostTRUCK);
			}

//			console.log(costTimeAtStops.toFixed(2));
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Cost(Time at stops)") + '</div><div class="otp-itinTripSummaryText">'+costTimeAtStops.toFixed(2)+ " euros" + '</div>');
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Travel Time") + '</div><div class="otp-itinTripSummaryText">'+otp.util.Time.secsToHrMin(itin.itinData.travelTime)+ " h" + '</div>');
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Operational Time") + '</div><div class="otp-itinTripSummaryText">'+otp.util.Time.secsToHrMin(itin.itinData.operationalTime)+ " h" + '</div>');
//			tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Waiting Time") + '</div><div class="otp-itinTripSummaryText">'+otp.util.Time.secsToHrMin(itin.itinData.waitingTime)+ " h" + '</div>');
			
			if(queryParams.capacityRequest != null && queryParams.capacityRequest != '' && parseInt(queryParams.capacityRequest) > 0)
				tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Number of container shipped") + '</div><div class="otp-itinTripSummaryText">'+queryParams.capacityRequest + '</div>');
				
           //TRANSLATORS: cost of trip
           // tripSummary.append('<div class="otp-itinTripSummaryLabel">' + _tr("Fare") +'</div><div class="otp-itinTripSummaryText">'+itin.getFareStr()+'</div>');
        }

        //Shuai (27-03-2017) button for bookmark and booking
        if(this.module.webapp.loginWidget != null && this.module.webapp.loginWidget.logged_in){
        	$('<div class="otp-itinTripSummaryLabel"><input type="button" style="height:20px" value="' + _tr("Bookmark") + '" /></div>')
        	.on('click', function(){
        		if(this_.module.webapp.loginWidget.logged_in){ //check if user has logged out
        			//make a bookmark of a certain itinerary and store it in the database
        			var url = otp.config.hostname + '/' + otp.config.restService + '/user/bookmark/add';
        			
        			$.ajax(url, {
        				type: 'POST',
        				data: JSON.stringify({
        					'username': $('#otp-username :first-child').html(),
        					'departure': queryParams.fromPlace,
        					'arrival': queryParams.toPlace + (queryParams.to2ndPlace == null ? '' : '---' + queryParams.to2ndPlace),
        					'itinerary': itin.itinData
        				}),
        				dataType: 'JSON',
        				contentType: "application/json",
        				
        				success: function(val){
							otp.widgets.Dialogs.showOkDialog("You have bookmarked this trip", "Bookmark Successful");
        				}        				
        			});
        		} 
        		else{
        			otp.widgets.Dialogs.showOkDialog("Please login!", "Error");
        		}        			
        	})
        	.appendTo(tripSummary);
        	
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
            					'arrival': queryParams.toPlace + (queryParams.to2ndPlace == null ? '' : '---' + queryParams.to2ndPlace),
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

    //TODO add start/end date of each leg in this function
    renderLeg : function(leg, previousLeg, nextLeg) {
        var this_ = this;

        if(otp.util.Itin.isTransit(leg.mode)) {
            var legDiv = $('<div></div>');

            if(leg.transit != 0){
            	$('<div class="otp-itin-leg-leftcol">'+otp.util.Time.secsToHrMin(leg.transit)+"h</div>").appendTo(legDiv);
            	$('<div class="otp-itin-leg-endpointDesc">' + _tr("transit time") + '</div>').appendTo(legDiv);
            }
            if(leg.boarding != 0){
            	$('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.startTime - leg.boarding * 1000)+"</div>").appendTo(legDiv);
            	$('<div class="otp-itin-leg-endpointDesc"><b>' + _tr("Boarding starts") + '</b></div>').appendTo(legDiv);
            	$('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
            	$('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
            	var inTransitDiv = $('<div class="otp-itin-leg-elapsedDesc" />').appendTo(legDiv);
            	$('<span><i>' + _tr("Boarding Time: ") + otp.util.Time.secsToHrMin(leg.boarding) + 'h</i></span>').appendTo(inTransitDiv);
            }
            $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);

            // show the start time and stop

            // prevaricate if this is a nonstruct frequency trip
            if( leg.isNonExactFrequency === true ){
                //TRANSLATORS: public transport drives every N minutes
            	$('<div class="otp-itin-leg-leftcol">' + ngettext("every %d min", "every %d mins", (leg.headway/60))+"</div>").appendTo(legDiv);
            } else {            	
                $('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.startTime)+"</div>").appendTo(legDiv);
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

            $('<span><i>' + _tr("Travel Time") + ": " + otp.util.Time.secsToHrMin(leg.duration)+' h</i></span>').appendTo(inTransitDiv);

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
                $('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.endTime)+"</div>").appendTo(legDiv);
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
            
            $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
            $('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
            
            if(leg.alighting != 0){
            	var inTransitDiv = $('<div class="otp-itin-leg-elapsedDesc" />').appendTo(legDiv);
            	$('<span><i>' + _tr("Alighting Time: ") + otp.util.Time.secsToHrMin(leg.alighting) + 'h</i></span>').appendTo(inTransitDiv);
            	$('<div class="otp-itin-leg-buffer"></div>').appendTo(legDiv);
            	$('<div class="otp-itin-leg-leftcol">'+otp.util.Time.formatItinTime(leg.endTime + leg.alighting * 1000)+"</div>").appendTo(legDiv);
            	$('<div class="otp-itin-leg-endpointDesc"><b>' + _tr("Alighting ends") + '</b></div>').appendTo(legDiv);
            }

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
    },
    
    //Shuai: some functions for multi-destination and capaicty mode
    getStartEndTimeForMultiDestId: function(itin, id, startEnd, capacityId){
    	var time;
    	if(startEnd == 'end'){
	    	for(var l=0; l<itin.itinData.legs.length; l++){
	    		var leg = itin.itinData.legs[l];
	    		if(leg.destinationId == id && leg.capacityId == capacityId){
	    			if(time == null)
	    				time = leg.endTime + leg.alighting * 1000;
	    			else if(time < (leg.endTime +leg.alighting * 1000))
	    				time = leg.endTime + leg.alighting * 1000;
	    		}        		
	    	}
	    	return time;	    	
    	}
    	else{
    		for(var l=0; l<itin.itinData.legs.length; l++){
    			var leg = itin.itinData.legs[l];
    			if(leg.destinationId == id && leg.capacityId == capacityId){
	    			if(time == null)
	    				time = leg.startTime - leg.boarding * 1000;
	    			else if(time > (leg.startTime - leg.boarding * 1000))
	    				time = leg.startTime - leg.boarding * 1000;
	    		}  
    		}
    		return time;
    	}
    	
//    	if(startEnd == 'end'){
//	    	for(var l=0; l<itin.itinData.legs.length; l++){
//	    		var leg = itin.itinData.legs[l];
//	    		if(leg.destinationId == id){
//	    			if(time == null)
//	    				time = leg.endTime;
//	    			else if(time < leg.endTime)
//	    				time = leg.endTime;
//	    		}        		
//	    	}
//	    	return time;	    	
//    	}
//    	else{
//    		for(var l=0; l<itin.itinData.legs.length; l++){
//    			var leg = itin.itinData.legs[l];
//    			if(leg.destinationId == id){
//	    			if(time == null)
//	    				time = leg.startTime;
//	    			else if(time > leg.startTime)
//	    				time = leg.startTime;
//	    		}  
//    		}
//    		return time;
//    	}
    },

    getDestName: function(itin, id){
    	var lastLeg;
    	for(var l=0; l<itin.itinData.legs.length; l++){
    		var leg = itin.itinData.legs[l];
    		if(leg.destinationId != id)
    			continue;
    		if(lastLeg == null)
    			lastLeg = leg;
    		if(lastLeg.endTime < leg.endTime)
    			lastLeg = leg;
    	}
    	return lastLeg.to.name;
    },
    
    loadIntermediateDestIdMapping: function(itin, intermediateDestList){
    	var destinations = [];
    	destinations[0] = itin.tripPlan.queryParams.toPlace.slice(0, itin.tripPlan.queryParams.toPlace.indexOf(':'));
    	var otherDest = itin.tripPlan.queryParams.otherEndNameStr.split('---');
    	for(var i=0; i < otherDest.length; i++)
    		destinations[i+1] = otherDest[i].slice(0, otherDest[i].indexOf(':'));
    	
//    	console.log(destinations);
    	
    	for(var i=0; i < itin.itinData.legs.length; i++){
    		var leg = itin.itinData.legs[i];
    		for(var j=0; j < destinations.length; j++){
//    			console.log(leg.to.name);
    			if(leg.to.name == destinations[j] && leg.destinationId.split('-').length > 1)
    				intermediateDestList[j+1] = leg;
    		}
    	}
    },
    
    loadItinerariesData: function(itin, destId, destName, isCommon, prev, index, intermediateDestList){
    	for(var l=index; l<itin.itinData.legs.length; l++) {
        	var leg = itin.itinData.legs[l];
//        	console.log(leg);
        	
        	if(!destId.includes(leg.destinationId)){
        		//adding a new explored destination Id
        		destId.push(leg.destinationId);
        		prev[leg.destinationId] = leg.previousDestinationId;

        		var Dests = leg.destinationId.split('-');
	        	destName[leg.destinationId] = '';
	        	if(Dests.length > 1){
	        		isCommon[leg.destinationId] = true;
	        		
	        		var intermediateDestId = null;
	        		for(var i=0; i < intermediateDestList.length; i++){
	        			if(intermediateDestList[i] != null && intermediateDestList[i].destinationId == leg.destinationId){
	        				intermediateDestId = i;
	        			}
	        		}
//	        		if(intermediateDestList.includes(leg)){
//	        			intermediateDestId = intermediateDestList.indexOf(leg);
////	        			console.log('leg destinationId: ' + leg.destinationId);
//	        		}
	        		if(intermediateDestId != null){
	        			var destLeg = intermediateDestList[intermediateDestId];
	        			destName[leg.destinationId] += (otp.util.Time.formatItinTime((destLeg.endTime + destLeg.alighting), otp.config.locale.time.time_format) + ':' + destLeg.to.name + ',');
	        		}
	        		console.log('intermediateDestId: ' + intermediateDestId);
	        		
	        		for(var i=0; i < Dests.length; i++){
	        			if(Dests[i] != intermediateDestId){
//	        				console.log(intermediateDestList[Dests[i]]);
	        				if(!(Dests[i] in intermediateDestList))
	        					destName[leg.destinationId] += this.getDestName(itin, Dests[i]) + ((i < Dests.length -1) ? ',' : '');
	        				else
	        					destName[leg.destinationId] += intermediateDestList[Dests[i]].to.name + ((i < Dests.length -1) ? ',' : '');
	        			}
		        	}
	        	}
	        	else{
	        		isCommon[leg.destinationId] = false;
	        		destName[leg.destinationId] = this.getDestName(itin, Dests[0]);
	        	}
	        	
	        	//search the tree (deep first)
	        	if((l+1) != itin.itinData.legs.length)
	        		for(var k=l+1; k < itin.itinData.legs.length; k++){
	        			var nextLeg = itin.itinData.legs[k];
//	        			if(itin == this.itineraries[3]){
//	        				console.log(leg.destinationId + ' -> ' + nextLeg.destinationId + ' : '+ index);
//	                		console.log(Dests.includes(nextLeg.destinationId.split('-')[0])&& (!destId.includes(nextLeg.destinationId)));
//	                	}
	        			if(Dests.includes(nextLeg.destinationId.split('-')[0]) && (!destId.includes(nextLeg.destinationId))){
	        				this.loadItinerariesData(itin, destId, destName, isCommon, prev, k, intermediateDestList);
	        			}
	        		}
	        	if(index != 0)
	        		return;
        	}
        }
    },
    
    
    getStartEndTimeForCapacityId: function(itin, id, startEnd){
    	var time;
    	if(startEnd == 'end'){
	    	for(var l=0; l<itin.itinData.legs.length; l++){
	    		var leg = itin.itinData.legs[l];
	    		if(leg.capacityId == id){
	    			if(time == null)
	    				time = leg.endTime + leg.alighting * 1000;
	    			else if(time < (leg.endTime +leg.alighting * 1000))
	    				time = leg.endTime + leg.alighting * 1000;
	    		}        		
	    	}
	    	return time;	    	
    	}
    	else{
    		for(var l=0; l<itin.itinData.legs.length; l++){
    			var leg = itin.itinData.legs[l];
    			if(leg.capacityId == id){
	    			if(time == null)
	    				time = leg.startTime - leg.boarding * 1000;
	    			else if(time > (leg.startTime - leg.boarding * 1000))
	    				time = leg.startTime - leg.boarding * 1000;
	    		}  
    		}
    		return time;
    	}
    },
    
    //Shuai(11-05-2018) get a list of gradient colors from red(255,0,0)-->yellow(255,255,0)-->green(0,255,0) for quality from 0-->100
    gradientColorForQuality: function(numOfBins){
    	var num = numOfBins ? numOfBins : 10;
    	var colorList = [];
    	colorList[0] = 'rgb(255,0,0)';
    	var half = Math.ceil(num/2);
    	for(var i=1; i < half; i++){
    		var v = 255*i/(half-1);
    		colorList[i] = 'rgb(255,' + v + ',0)';
    	}
    	for(var i=1; i <= (num-half); i++){
    		var v = 255*(1-i/(num-half));
    		colorList[half+i-1] = 'rgb(' + v + ',255,0)';
    	}
//    	console.log(colorList);
    	return colorList;
    },
});
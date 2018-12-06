
//Shuai (28-03-2017) Widget to display the bookmarked itineraries.

otp.namespace("otp.widgets");


otp.widgets.ItinerariesHistoryWidget =
    otp.Class(otp.widgets.Widget, {
    
    id: null,
    module: null,
    
    itinsAccord : null,
    footer : null,

    itineraries : null,
    activeIndex : null,
    
    showItineraryLink : true,
    showPrintLink : true,
    showEmailLink : true,
    showSearchLink : false,
    	
    initialize: function(id, value, module){
    	this.module = module;
    	
    	otp.widgets.Widget.prototype.initialize.call(this, id, module, {
            //TRANSLATORS: Widget title
            title : _tr(value),
            cssClass : module.itinerariesWidgetCssClass || 'otp-defaultItinsWidget',
            resizable : true,
            closeable : true,
            persistOnClose : true
        });
    },
    
    activeItin : function() {
        return this.itineraries[this.activeIndex];
    },
    
    updateItineraries: function(itineraries, queryParams){
    	
        var this_ = this;
        var divId = this.id+"-itinsAccord";
        
        if(this.minimized) this.unminimize();
                
        this.itineraries = itineraries;

        this.clear();
        
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
        
        for(var i=0; i<this.itineraries.length; i++) {
            var itin = this.itineraries[i];

            var headerDivId = divId+'-headerContent-'+i;
            $('<h3><div id='+headerDivId+'></div></h3>')
            .appendTo(this.itinsAccord)
            .data('itin', itin)
            .data('index', i)
            .click(function(evt) {
                var itin = $(this).data('itin');
                this_.module.drawItinerary(itin);
                this_.activeIndex = $(this).data('index');
            });

            $('<div id="'+divId+'-'+ i +'"></div>')
            .appendTo(this.itinsAccord)
            .append(this.renderItinerary(itin, queryParams, i));
        }
        this.activeIndex = 0;

        this.itinsAccord.accordion({
            active: this.activeIndex,
            heightStyle: "fill"
        });
        
        this.renderHeaders();
        this_.itinsAccord.accordion("resize");

        this.$().resize(function(){
            this_.itinsAccord.accordion("resize");
            this_.renderHeaders();
        });

        this.$().draggable({ cancel: "#"+divId });
    },
    
    clear : function() {
        if(this.itinsAccord !== null) this.itinsAccord.remove();
        if(this.footer !== null) this.footer.remove();
    },
    
    renderHeaders : function() {
        for(var i=0; i<this.itineraries.length; i++) {
            var header = $("#"+this.id+'-itinsAccord-headerContent-'+i);
            this.renderHeaderContent(this.itineraries[i], i, header);
        }
    },

    renderHeaderContent : function(itin, index, parentDiv) {
        parentDiv.empty();
        var div = $('<div style="position: relative; height: 20px;"></div>').appendTo(parentDiv);
		div.append('<div class="otp-itinsAccord-header-number">'+(index+1)+'.</div>');
	
        var maxSpan = itin.tripPlan.latestEndTime - itin.tripPlan.earliestStartTime;
        var startPct = (itin.itinData.startTime - itin.tripPlan.earliestStartTime) / maxSpan;
        var itinSpan = itin.getEndTime() - itin.getStartTime();
        var timeWidth = 32;
        var startPx = 20+timeWidth, endPx = div.width()-timeWidth - (itin.groupSize ? 48 : 0);
        var pxSpan = endPx-startPx;
        var leftPx = startPx + startPct * pxSpan;
        var widthPx = pxSpan * (itinSpan / maxSpan);

		//PHUONG: draw the black line:
        //div.append('<div style="position:absolute; width: '+(widthPx+5)+'px; height: 2px; left: '+(leftPx-2)+'px; top: 9px; background: black;" />');

        var timeStr = otp.util.Time.formatItinTime(itin.getStartTime(), otp.config.locale.time.time_format);
	/*timeStr = timeStr.substring(0, timeStr.length - 1);*/
        div.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx-32)+'px;">' + timeStr + '</div>');

        var timeStr = otp.util.Time.formatItinTime(itin.getEndTime(), otp.config.locale.time.time_format);
	/*timeStr = timeStr.substring(0, timeStr.length - 1);*/
        div.append('<div class="otp-itinsAccord-header-time" style="left: '+(leftPx+widthPx+2)+'px;">' + timeStr + '</div>');

       for(var l=0; l<itin.itinData.legs.length; l++) {
            var leg = itin.itinData.legs[l];
            var startPct = (leg.startTime - itin.tripPlan.earliestStartTime) / maxSpan;
            var endPct = (leg.endTime - itin.tripPlan.earliestStartTime) / maxSpan;
            var leftPx = startPx + startPct * pxSpan + 1;
            var widthPx = pxSpan * (leg.endTime - leg.startTime) / maxSpan - 1;

            //div.append('<div class="otp-itinsAccord-header-segment" style="width: '+widthPx+'px; left: '+leftPx+'px; background: '+this.getModeColor(leg.mode)+' url(images/mode/'+leg.mode.toLowerCase()+'.png) center no-repeat;"></div>');

            var showRouteLabel = widthPx > 40 && otp.util.Itin.isTransit(leg.mode) && leg.routeShortName && leg.routeShortName.length <= 6;
            var segment = $('<div class="otp-itinsAccord-header-segment" />')
            .css({
                width: widthPx,
                left: leftPx,
                //background: this.getModeColor(leg.mode)
                background: this.getModeColor(leg.mode)+' url('+otp.config.resourcePath+'images/mode/'+leg.mode.toLowerCase()+'.png) center no-repeat'
            })
            .appendTo(div);
            if(showRouteLabel) segment.append('<div style="margin-left:'+(widthPx/2+9)+'px;">'+leg.routeShortName+'</div>');

        }

       /* if(itin.groupSize) {
            var segment = $('<div class="otp-itinsAccord-header-groupSize">'+itin.groupSize+'</div>')
            .appendTo(div);
        }*/

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

        //Shuai (27-03-2017) manage bookmark or booking
        if(this.module.webapp.loginWidget.logged_in){
//        	if(this.id.includes("Bookmark")){
//	        	$('<div class="otp-itinTripSummaryLabel"><input type="button" style="height:20px" value="' + _tr("Delete this bookmark") + '" /></div>')
//	        	.on('click', function(){
//	        		if(this_.module.webapp.loginWidget.logged_in){ //check if user has logged out
//	        			//delete a bookmark of a certain itinerary and update the database
//	        			var url = otp.config.hostname + '/' + otp.config.restService + '/user/bookmark/remove';
//	        			
//	        			$.ajax(url, {
//	        				type: 'POST',
//	        				data: JSON.stringify({
//	        					'username': $('otp-username').val(),
//	        					//send itinerary data
//	        					
//	        				}),
//	        				dataType: 'JSON',
//	        				contentType: "application/json",
//	        				
//	        				success: function(val){
//								otp.widgets.Dialogs.showOkDialog("You have deleted this bookmark", "Delete Successful");
//	        				}        				
//	        			});
//	        		} 
//	        		else{
//	        			otp.widgets.Dialogs.showOkDialog("Please login!", "Error");
//	        		}        			
//	        	})
//	        	.appendTo(tripSummary);
//        	}
//        	else if(this.id.includes("MyBooking")){
//        		
//        	}    
        	$('<div class="otp-itinTripSummaryLabel"><input type="button" style="height:20px" value="' + _tr("Delete this trip") + '" /></div>')
        	.on('click', function(){
        		if(this_.module.webapp.loginWidget.logged_in){ //check if user has logged out
        			//delete a booking of a certain itinerary and update the database
        			var url = otp.config.hostname + '/' + otp.config.restService + '/user/booking/remove';
        			
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
							otp.widgets.Dialogs.showOkDialog("You have deleted this booking", "Delete Successful");
        				}        				
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
                this_.module.drawAllStartBubbles(this_.itineraries[this_.activeIndex]);
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
                this_.module.drawAllStartBubbles(this_.itineraries[this_.activeIndex]);
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
})
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

otp.namespace("otp.modules.multimodal");


otp.modules.multimodal.MultimodalPlannerModule = 
    otp.Class(otp.modules.planner.PlannerModule, {

    //TRANSLATORS: module name
    moduleName  : _tr("Multimodal Trip Planner"),
    
    itinWidget  : null,
    
    itinBookmarkWidget  : null,
    itinMyBookingWidget : null,
    
    showIntermediateStops : false,
    
    stopsWidget: false,
    
    allStops: [],
    
    routeData : null,
    
    originStartMarker: null,
    originEndMarker: null,
    originOtherEndMarker: [],
    
    polyLineStart: null,
    polyLineEnd: null,
    polyLineOtherEnd: [],
    
    errMsg: null,
    
    username : null,
    userrole : null,
    
    allStops: [],
    
    ApproximateLocationSelector: null,
    
    initialize : function(webapp, id, options) {
        otp.modules.planner.PlannerModule.prototype.initialize.apply(this, arguments);
        console.log(options);
        if('username' in options){
        	this.username = options['username'];
        	this.userrole = options['userrole']
        }
    },

    activate : function() {
        if(this.activated) return;
    	console.log("activate multimodal planner module!!");

        otp.modules.planner.PlannerModule.prototype.activate.apply(this);

        // set up options widget
        
        var optionsWidgetConfig = {
                //TRANSLATORS: widget name
                title : _tr("Trip Options"),
                closeable : true,
                persistOnClose: true,
        };
        
        if(typeof this.tripOptionsWidgetCssClass !== 'undefined') {
            console.log("set tripOptionsWidgetCssClass: " + this.tripOptionsWidgetCssClass); 
            optionsWidgetConfig['cssClass'] = this.tripOptionsWidgetCssClass;
        }
        	
        this.optionsWidget = new otp.widgets.tripoptions.TripOptionsWidget(
            'otp-'+this.id+'-optionsWidget', this, optionsWidgetConfig);
        
        $(document).ready(function() {
            $(window).resize(function() {
                var bodyheight = $(this).height();
                $("#otp-planner-optionsWidget").css("max-height", bodyheight*0.8);
                $("#otp-planner-optionsWidget-scollPanel").css("max-height", bodyheight*0.7);
            }).resize();
        });
        
        //TODO show different sets of options depending on the different users.
        
        var timeSelectorArrive = new otp.widgets.tripoptions.TimeSelectorArrive(this.optionsWidget);
        var capacityWidget = new otp.widgets.tripoptions.capacityWidget(this.optionsWidget);
        var bikeTriangle = new otp.widgets.tripoptions.BikeTriangle(this.optionsWidget);
        var riskTriangle = new otp.widgets.tripoptions.RiskTriangle(this.optionsWidget);
        
        this.errMsg = new otp.widgets.tripoptions.errMsg(this.optionsWidget);
        
        if(this.webapp.geocoders && this.webapp.geocoders.length > 0) {
	    	this.optionsWidget.addControl("location1", new otp.widgets.tripoptions.location1(this.optionsWidget, this.webapp.geocoders, timeSelectorArrive, capacityWidget), true);
	        this.optionsWidget.addVerticalSpace(12, true);
        }
        
        var bannedRoutes = new otp.widgets.tripoptions.BannedRoutes(this.optionsWidget, this.webapp.geocoders);
        var forcedRoutes = new otp.widgets.tripoptions.ForcedRoutes(this.optionsWidget, this.webapp.geocoders);
        var passBy = new otp.widgets.tripoptions.PassBy(this.optionsWidget, this.webapp.geocoders);
        var bannedStops = new otp.widgets.tripoptions.BannedStops(this.optionsWidget, this.webapp.geocoders);
        
        /*if(this.webapp.geocoders && this.webapp.geocoders.length > 0) {
            this.optionsWidget.addControl("locations", new otp.widgets.tripoptions.LocationsSelector(this.optionsWidget, this.webapp.geocoders), true);
            this.optionsWidget.addVerticalSpace(12, true);
        }*/
        this.optionsWidget.addControl("time", new otp.widgets.tripoptions.TimeSelector(this.optionsWidget), true);
        this.optionsWidget.addVerticalSpace(12, true);
        
        
		this.optionsWidget.addControl("timeArrive", timeSelectorArrive/*new otp.widgets.tripoptions.TimeSelectorArrive(this.optionsWidget)*/, true);
        this.optionsWidget.addVerticalSpace(12, true);
        /*this.optionsWidget.addControl("slowSteaming", new otp.widgets.tripoptions.slowSteaming(this.optionsWidget), true);
        this.optionsWidget.addVerticalSpace(12, true);*/
        
        //Shuai (20-02-2018) divide all the trip options into different groups (i.e, basic, advanced, risk, configuration...)
        var group1 = new otp.widgets.tripoptions.AdvancedGroup(this.optionsWidget);
        this.optionsWidget.addControl("Group1", group1, true);
        this.optionsWidget.addVerticalSpace(12, true); 
        group1.addWidgets(new otp.widgets.tripoptions.ModeSelector(this.optionsWidget));
        if(this.webapp.geocoders && this.webapp.geocoders.length > 0) {
        	group1.addWidgets(new otp.widgets.tripoptions.routesConfigurationWidget(this.optionsWidget, bannedRoutes, forcedRoutes, passBy, bannedStops));
            group1.addWidgets(bannedRoutes);
            group1.addWidgets(forcedRoutes);
	        group1.addWidgets(passBy);
	        group1.addWidgets(bannedStops);
        }
        group1.addWidgets(capacityWidget);
        group1.addWidgets(new otp.widgets.tripoptions.driverRestTimeWidget(this.optionsWidget));
        group1.setWidgets();
                
        var group2 = new otp.widgets.tripoptions.ConfigurationGroup(this.optionsWidget);
        this.optionsWidget.addControl("Group2", group2, true);
        this.optionsWidget.addVerticalSpace(12, true);
        group2.addWidgets(new otp.widgets.tripoptions.generalConfigurationWidget(this.optionsWidget, bikeTriangle, riskTriangle));
        group2.addWidgets(new otp.widgets.tripoptions.vehicleConfigurationWidget(this.optionsWidget));
        group2.addWidgets(new otp.widgets.tripoptions.costCO2(this.optionsWidget));
        group2.addWidgets(new otp.widgets.tripoptions.costHour(this.optionsWidget));
        group2.addWidgets(new otp.widgets.tripoptions.costKm(this.optionsWidget));
        group2.addWidgets(new otp.widgets.tripoptions.confDataWidget(this.optionsWidget));
        group2.addWidgets(bikeTriangle);
        group2.setWidgets();
                
        var group3 = new otp.widgets.tripoptions.RiskGroup(this.optionsWidget);
        this.optionsWidget.addControl("Group3", group3, true);
        this.optionsWidget.addVerticalSpace(12, true);
        group3.addWidgets(new otp.widgets.tripoptions.riskAnalysis(this.optionsWidget));
        group3.addWidgets(riskTriangle);
        group3.setWidgets();
                
//		var modeSelector = new otp.widgets.tripoptions.ModeSelector(this.optionsWidget);
//        this.optionsWidget.addControl("mode", modeSelector, true);
    
		//modeSelector.addModeControl(new otp.widgets.tripoptions.sortResultType(this.optionsWidget));
		//modeSelector.addModeControl(new otp.widgets.tripoptions.sortResultType1(this.optionsWidget));
		//modeSelector.addModeControl(new otp.widgets.tripoptions.MaxWalkSelector(this.optionsWidget));
		// modeSelector.addModeControl(new otp.widgets.tripoptions.bannedTrips(this.optionsWidget));
//		 modeSelector.addModeControl(new otp.widgets.tripoptions.costCO2(this.optionsWidget));
//		 modeSelector.addModeControl(new otp.widgets.tripoptions.costHour(this.optionsWidget));
//		 modeSelector.addModeControl(new otp.widgets.tripoptions.costKm(this.optionsWidget));
		
       // modeSelector.addModeControl(new otp.widgets.tripoptions.KPIimportance1(this.optionsWidget));
		 
		//Shuai (13-03-2017)
		//this.optionsWidget.addControl("KPIimportance", new otp.widgets.tripoptions.KPIimportance(this.optionsWidget), true);
        //this.optionsWidget.addVerticalSpace(12, true);
				
		//modeSelector.addModeControl(new otp.widgets.tripoptions.bannedTrips1(this.optionsWidget));
//		modeSelector.addModeControl(new otp.widgets.tripoptions.BikeTriangle(this.optionsWidget));
//		modeSelector.addModeControl(new otp.widgets.tripoptions.RiskTriangle(this.optionsWidget));	
		
		//modeSelector.addModeControl(new otp.widgets.tripoptions.PreferredRoutes(this.optionsWidget));
//        modeSelector.addModeControl(new otp.widgets.tripoptions.BannedRoutes(this.optionsWidget));
//        modeSelector.addModeControl(new otp.widgets.tripoptions.ForcedRoutes(this.optionsWidget));
//        //modeSelector.addModeControl(new otp.widgets.tripoptions.WheelChairSelector(this.optionsWidget)); 
//        if(this.webapp.geocoders && this.webapp.geocoders.length > 0) {
//        	modeSelector.addModeControl(new otp.widgets.tripoptions.PassBy(this.optionsWidget, this.webapp.geocoders));
//        	modeSelector.addModeControl(new otp.widgets.tripoptions.BannedStops(this.optionsWidget, this.webapp.geocoders));
//        }
        
        //Shuai(12-02-2018)
//        modeSelector.addModeControl(new otp.widgets.tripoptions.capacityWidget(this.optionsWidget));
        
        //Shuai(18-01-2018)
//        modeSelector.addModeControl(new otp.widgets.tripoptions.riskAnalysis(this.optionsWidget));
        
        //Shuai comment this line to hide the one-line generic call
//        modeSelector.addModeControl(new otp.widgets.tripoptions.genericCall(this.optionsWidget));
        
//        modeSelector.refreshModeControls();

        this.optionsWidget.addSeparator();
        this.optionsWidget.addControl("submit", new otp.widgets.tripoptions.Submit(this.optionsWidget));
        
        this.optionsWidget.applyQueryParams(this.defaultQueryParams);
        
        // add stops layer
        this.stopsLayer = new otp.layers.StopsLayer(this);
        
        console.log(this.optionsWidget);
        console.log(this.optionsWidget.controls.Group1.widgets);
//        this.ApproximateLocationSelector = new otp.widgets.ApproximateLocationSelector('otp-' + this.id + 'ApproximateLocationSelector', this, 'Approximate Location');
    },
    
    routesLoaded : function() {
        // set trip / stop viewer widgets
        
        this.tripViewerWidget = new otp.widgets.transit.TripViewerWidget("otp-"+this.id+"-tripViewerWidget", this);
        this.tripViewerWidget.center();
        
        this.stopViewerWidget = new otp.widgets.transit.StopViewerWidget("otp-"+this.id+"-stopViewerWidget", this);
        this.stopViewerWidget.center();

        //Shuai(06-03-2018) hide the startup spinner when routes/stops loaded
        $('#otp-startupSpinner').hide();
    },
    
    getExtendedQueryParams : function() {
        return { showIntermediateStops : this.showIntermediateStops };
    },
            
    processPlan : function(tripPlan, restoring) {
        if(this.itinWidget == null) {
            this.itinWidget = new otp.widgets.ItinerariesWidget(this.id+"-itinWidget", this);
        }
        if(restoring && this.restoredItinIndex) {
            this.itinWidget.show();
            this.itinWidget.updateItineraries(tripPlan.itineraries, tripPlan.queryParams, this.restoredItinIndex); //PHUONG: called at ItinerariesWidget
            this.restoredItinIndex = null;
        } else  {
            this.itinWidget.show();
            this.itinWidget.updateItineraries(tripPlan.itineraries, tripPlan.queryParams);
        }
        
        /*if(restoring) {
            this.optionsWidget.restorePlan(tripPlan);
        }*/
        this.drawItinerary(tripPlan.itineraries[0]);
        
        //test    	
    	this.tripPlan = tripPlan;
    },
    
    //test
    tripPlan: null,
    
    //Shuai (28-03-2017) function to process the bookmarked itinerary data stored in the database and show them in the widget
//    processBookmark: function(){
//    	//obtain bookmark data from database
//    	url = otp.config.hostname + '/' + otp.config.restService + '/user/bookmark/get';
//    	$.ajax(url, {
//    		
//    	});
//    	
//    	if(this.itinBookmarkWidget == null) {
//          this.itinBookmarkWidget = new otp.widgets.ItinerariesHistoryWidget(this.id+"-itinBookmarkWidget", "Bookmark", this);
//    	}
//    	this.itinBookmarkWidget.show();
//    	this.itinBookmarkWidget.updateItineraries(this.tripPlan.itineraries, this.tripPlan.queryParams);
//    	this.itinBookmarkWidget.bringToFront();
//    	
//    	this.drawItinerary(this.tripPlan.itineraries[0]);
//    },
    //End Shuai
    
    processMyBooking: function(){
    	//obtain booking data from database
    	var this_ = this;
    	url = otp.config.hostname + '/' + otp.config.restService + '/user/booking/get';
    	
    	$.ajax(url, {
    		type: 'GET',
    		//TODO to be modified
			data: {'username': $('#otp-username :first-child').html()},
			dataType: 'JSON',
			
			success: function(data){
				if(data != null){
					otp.widgets.Dialogs.showOkDialog("Enjoy your trip", "Successful");
					
			    	if(this_.itinMyBookingWidget == null) {
			            this_.itinMyBookingWidget = new otp.widgets.ItinerariesHistoryWidget(this_.id+"-itinMyBookingWidget", "My Booking", this_);
			      	}
			      	this_.itinMyBookingWidget.show();
			      	this_.itinMyBookingWidget.updateItineraries(data.itineraries, data.queryParams);
			      	this_.itinMyBookingWidget.bringToFront();
			      	
			      	this_.drawItinerary(data.itineraries[0]);
				}
			} 
    	})
    },
    
    addMapContextMenuItems : function() {
        var this_ = this;
        //TRANSLATORS: Context menu
        this.webapp.map.addContextMenuItem(_tr("Set as Start Location"), function(latlng) {
            this_.startApproximateSearch(new L.LatLng(latlng.lat, latlng.lng), 'start');
        });
        //TRANSLATORS: Context menu
        this.webapp.map.addContextMenuItem(_tr("Set as End Location"), function(latlng) {
            this_.startApproximateSearch(new L.LatLng(latlng.lat, latlng.lng), 'end');
        });
    },
    
    
    //Shuai (22-01-2018) Approximate Location rework. User click on map then the system selects directly the closest main location for optimization.
    handleClick : function(event) {
    	var latlng = new L.LatLng(event.latlng.lat, event.latlng.lng);
    	if(this.startLatLng == null) {
    		this.startApproximateSearch(latlng, 'start');
    	}
    	else if(this.endLatLng == null) {
    		this.startApproximateSearch(latlng, 'end');
    	}
    	else{
    		$('#otp-planner-optionsWidget-location2-addButton').data('onMapClick', true).click();
    		$('#otp-planner-optionsWidget-location2-addButton').removeData('onMapClick');
    		this.startApproximateSearch(latlng, 'otherEnd', 'new');
    	}
    },
    
    startApproximateSearch: function(latlng, startend, status){
    	var this_ = this;    	
    	if(this.allStops.length == 0){
			var url = otp.config.hostname + '/' + otp.config.restService + '/index/stops';
			var loginStatus = this_.checkLoginStatus();
			if(loginStatus != "-1"){
				console.log("loged in");
				url = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/stops';
			}
			$.ajax(url,{
		        success: function(data) {
		        	this_.allStops = data;
		        	this_.sortStopsBasedOnDistance(latlng);
		        	this_.setApproximateStartEnd(latlng, startend, this_.allStops[0], status);
		        }
			});
		}
		else{
			this_.sortStopsBasedOnDistance(latlng);
			this_.setApproximateStartEnd(latlng, startend, this_.allStops[0], status);
		}
    },
    
    setApproximateStartEnd: function(latlng, startend, mainLocation, status){
    	var this_ = this;
    	console.log(mainLocation);
    	var coordinateMainLocation = new L.LatLng(mainLocation.lat, mainLocation.lon);
    	
    	if(startend == 'start'){
    		if(this.originStartMarker == null){
    			this.originStartMarker = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
    			
    			var popup = $('<div><strong>' + 'Start ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + 
    					'</strong><center><input type="image" src="images/cross.png"/></center><div>');
    			popup.find('input').attr('title', 'remove this location').click(function(){
    				this_.removeOrigins('start');
    				$('#otp-planner-optionsWidget-location2-start').val('');
    				this_.markerLayer.removeLayer(this_.startMarker);
    				this_.startMarker = this_.startName = this_.startLatLng = null;
    			});
    			this.originStartMarker.bindPopup(popup[0]);
    			
    			this.originStartMarker.on('dragend', $.proxy(function() {
	                this.webapp.hideSplash();
	                console.log(this.originStartMarker.getLatLng());
	                var coordinate = this.originStartMarker.getLatLng();
	                this.startApproximateSearch(coordinate, 'start');
	            }, this));
	            this.markerLayer.addLayer(this.originStartMarker);	            
    		}
    		else{
    			this.originStartMarker.setLatLng(latlng);
    		}
    		this.setPolyLine(latlng, coordinateMainLocation, startend);
    		this.setStartPoint(coordinateMainLocation, false, mainLocation.name);
    	}
    	else if(startend == 'end'){
    		if(this.originEndMarker == null){
    			this.originEndMarker = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
    			
    			var popup = $('<div><strong>' + 'End ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + 
    					'</strong><center><input type="image" src="images/cross.png"/></center><div>');
    			popup.find('input').attr('title', 'remove this location').click(function(){
    				this_.removeOrigins('end');
    				$('#otp-planner-optionsWidget-location2-end').val('');
    				this_.markerLayer.removeLayer(this_.endMarker);
    				this_.endMarker = this_.endName = this_.endLatLng = null;
    			});
    			this.originEndMarker.bindPopup(popup[0]);
    			
    			this.originEndMarker.on('dragend', $.proxy(function() {
	                this.webapp.hideSplash();
	                console.log(this.originEndMarker.getLatLng());
	                var coordinate = this.originEndMarker.getLatLng();
	                this.startApproximateSearch(coordinate, 'end');
	            }, this));
	            this.markerLayer.addLayer(this.originEndMarker);
    		}
    		else
    			this.originEndMarker.setLatLng(latlng);
    		this.setPolyLine(latlng, coordinateMainLocation, startend);
    		this.setEndPoint(coordinateMainLocation, false, mainLocation.name, 1);
    	}
    	else{
    		//status is either 'new' or the index of the destination
        	if(status == 'new'){
	    		var nEnd = this.optionsWidget.controls.location1.nEnd;
	    		this.originOtherEndMarker[nEnd] = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
	    		
	    		var popup = $('<div><strong>' + 'End'+ nEnd + ' ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + '</strong><center><input type="image" src="images/cross.png"/></center><div>');
				popup.find('input').attr('title', 'remove this location').data('correspondLocation', $('#otp-planner-optionsWidget-location2-clearButton' + nEnd)).click(function(){
					$(this).data('correspondLocation').click();
				});
				this.originOtherEndMarker[nEnd].bindPopup(popup[0]);
				        		
	    		this.originOtherEndMarker[nEnd].on('dragend', function(){
	    			console.log(nEnd);
	    			console.log(this_.originOtherEndMarker.indexOf(this));
	    			//in case that a marker is deleted, index changed
	    			var index = this_.originOtherEndMarker.indexOf(this);
	                this_.webapp.hideSplash();
	                var coordinate = this_.originOtherEndMarker[index].getLatLng();
	                this_.startApproximateSearch(coordinate, 'otherEnd', index);
	            });
	            this.markerLayer.addLayer(this.originOtherEndMarker[nEnd]);
	            this.setPolyLine(latlng, coordinateMainLocation, nEnd);
	            this.setEndPoint(coordinateMainLocation, false, mainLocation.name, nEnd);
	        }
	    	else{
	    		this.originOtherEndMarker[status].setLatLng(latlng);
	    		this.setPolyLine(latlng, coordinateMainLocation, status);
	    		this.setEndPoint(coordinateMainLocation, false, mainLocation.name, status);
	    	}
    	}
    },
    
    setPolyLine: function(latlng, approximate, startend){
    	if(startend == 'start'){
    		if(this.polyLineStart == null){
    			this.polyLineStart = new L.Polyline([latlng, approximate], {dashArray: '5,10',});
    		}
    		else{
    			this.polyLineStart.setLatLngs([latlng, approximate]);
    		}    
    		this.pathLayer.addLayer(this.polyLineStart);
    	}
    	else if(startend == 'end'){
    		if(this.polyLineEnd == null){
    			this.polyLineEnd = new L.Polyline([latlng, approximate], {dashArray: '5,10',});
    		}
    		else
    			this.polyLineEnd.setLatLngs([latlng, approximate]);
    		this.pathLayer.addLayer(this.polyLineEnd);
    	}
    	else{
    		if(!(startend in this.polyLineOtherEnd)){
    			this.polyLineOtherEnd[startend] = new L.Polyline([latlng, approximate], {dashArray: '5,10',});
    		}
    		else
    			this.polyLineOtherEnd[startend].setLatLngs([latlng, approximate]);
    		this.pathLayer.addLayer(this.polyLineOtherEnd[startend]);
    	}
    },
    
    removeOrigins: function(index, onMapClick){
    	if(index == 'start'){
			this.markerLayer.removeLayer(this.originStartMarker);
			this.pathLayer.removeLayer(this.polyLineStart);
			this.originStartMarker = null;
			this.polyLineStart = null;
		}
		else if(index == 'end'){
			this.markerLayer.removeLayer(this.originEndMarker);
			this.pathLayer.removeLayer(this.polyLineEnd);    		
			this.originEndMarker = null;
			this.polyLineEnd = null;
		}
		else{
			if(onMapClick){
				this.markerLayer.removeLayer(this.originOtherEndMarker[index]);
				this.pathLayer.removeLayer(this.polyLineOtherEnd[index]);    		
			}
			this.originOtherEndMarker.splice(index, 1);
			this.polyLineOtherEnd.splice(index, 1);

			//rename the popup of other end markers
			var nEnd = this.optionsWidget.controls.location1.nEnd;
			for(var i=index; i <= nEnd; i++){
				if(this.originOtherEndMarker[i] != null){
					var content = this.originOtherEndMarker[i]._popup._content;
					var num = content.textContent.charAt(3);
					var newText = 'End' + (num-1) + ' (' + content.textContent.split('(')[1];
					$(content).find('strong').html(newText);
				}
			}
		}
    },
    
    sortStopsBasedOnDistance: function(latlng){
    	var this_ = this;    	    	
    	this.allStops.sort(function(stop1, stop2){
    		var distance1 = latlng.distanceTo(new L.LatLng(stop1.lat, stop1.lon));
    		var distance2 = latlng.distanceTo(new L.LatLng(stop2.lat, stop2.lon));
    		if(distance1 < distance2)
    			return -1;
    		else 
    			return 1;
    	});
    },

    //Shuai (28-07-2017) click on the map to select origin Start/End and automatically choose nearest stop
//    handleClick : function(event) {
//        if(this.startLatLng == null) {
//        	this.ApproximateLocationSelector.selectApproximateStartEnd(new L.LatLng(event.latlng.lat, event.latlng.lng), 'start');
//        }
//        else if(this.endLatLng == null) {
//        	this.ApproximateLocationSelector.selectApproximateStartEnd(new L.LatLng(event.latlng.lat, event.latlng.lng), 'end');
//        }
//        else{
//        	this.ApproximateLocationSelector.selectApproximateStartEnd(new L.LatLng(event.latlng.lat, event.latlng.lng), 'otherEnd', 'new');
//        	$('#otp-planner-optionsWidget-location2-addButton').data('onMapClick', true).click();
//        }        
//    	this.ApproximateLocationSelector.show();
//    },
//    
//    setApproximateStartEnd: function(latlng, selectedStop, startend, status){
//    	var this_ = this;
//    	var selectedCoordinate = new L.LatLng(selectedStop.lat, selectedStop.lon);
//    	if(startend == 'start'){
//    		if(this.originStartMarker == null){
//    			this.originStartMarker = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
//    			
//    			var popup = $('<div><strong>' + 'Start ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + '</strong><center><input type="image" src="images/cross.png"/></center><div>');
//    			popup.find('input').attr('title', 'remove this location').click(function(){
//    				this_.removeOrigins('start');
//    				$('#otp-planner-optionsWidget-location2-start').val('');
//    				this_.markerLayer.removeLayer(this_.startMarker);
//    				this_.startMarker = this_.startName = this_.startLatLng = null;
//    			});
//    			this.originStartMarker.bindPopup(popup[0]);
//    			
//    			this.originStartMarker.on('dragend', $.proxy(function() {
//	                this.webapp.hideSplash();
//	                console.log(this.originStartMarker.getLatLng());
//	                var coordinate = this.originStartMarker.getLatLng();
//	                this.ApproximateLocationSelector.selectApproximateStartEnd(coordinate, 'start');
//	                this.ApproximateLocationSelector.show();
//	            }, this));
//	            this.markerLayer.addLayer(this.originStartMarker);	            
//    		}
//    		else{
//    			this.originStartMarker.setLatLng(latlng);
//    		}
//    		this.setPolyLine(latlng, selectedCoordinate, startend);
//    		this.setStartPoint(selectedCoordinate, false, selectedStop.name);
//    	}
//    	else if(startend == 'end'){
//    		if(this.originEndMarker == null){
//    			this.originEndMarker = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
//    			
//    			var popup = $('<div><strong>' + 'End ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + '</strong><center><input type="image" src="images/cross.png"/></center><div>');
//    			popup.find('input').attr('title', 'remove this location').click(function(){
//    				this_.removeOrigins('end');
//    				$('#otp-planner-optionsWidget-location2-end').val('');
//    				this_.markerLayer.removeLayer(this_.endMarker);
//    				this_.endMarker = this_.endName = this_.endLatLng = null;
//    			});
//    			this.originEndMarker.bindPopup(popup[0]);
//    			
//    			this.originEndMarker.on('dragend', $.proxy(function() {
//	                this.webapp.hideSplash();
//	                console.log(this.originEndMarker.getLatLng());
//	                var coordinate = this.originEndMarker.getLatLng();
//	                this.ApproximateLocationSelector.selectApproximateStartEnd(coordinate, 'end');
//	                this.ApproximateLocationSelector.show();
//	            }, this));
//	            this.markerLayer.addLayer(this.originEndMarker);
//    		}
//    		else
//    			this.originEndMarker.setLatLng(latlng);
//    		this.setPolyLine(latlng, selectedCoordinate, startend);
//    		this.setEndPoint(selectedCoordinate, false, selectedStop.name, 1);
//    	}
//    	else{    		
//        	if(status == 'new'){   		
//        		var nEnd = this.optionsWidget.controls.location1.nEnd;
//        		this.originOtherEndMarker[nEnd] = new L.Marker(latlng, {icon: this.icons.large0, draggable: true});
//        		
//        		var popup = $('<div><strong>' + 'End'+ nEnd + ' ('+latlng.lat.toFixed(4)+','+latlng.lng.toFixed(4)+')' + '</strong><center><input type="image" src="images/cross.png"/></center><div>');
//    			popup.find('input').attr('title', 'remove this location').data('correspondLocation', $('#otp-planner-optionsWidget-location2-clearButton' + nEnd)).click(function(){
//    				$(this).data('correspondLocation').click();
//    			});
//    			this.originOtherEndMarker[nEnd].bindPopup(popup[0]);
//    			        		
//        		this.originOtherEndMarker[nEnd].on('dragend', function(){
//	                this_.webapp.hideSplash();
//	                var coordinate = this_.originOtherEndMarker[nEnd].getLatLng();
//	                this_.ApproximateLocationSelector.selectApproximateStartEnd(coordinate, 'otherEnd', nEnd);
//	                this_.ApproximateLocationSelector.show();
//	            });
//	            this.markerLayer.addLayer(this.originOtherEndMarker[nEnd]);
//	            this.setPolyLine(latlng, selectedCoordinate, nEnd);
//	            this.setEndPoint(new L.LatLng(selectedStop.lat, selectedStop.lon), false, selectedStop.name, nEnd);
//	        }
//        	else{
//        		this.originOtherEndMarker[status].setLatLng(latlng);
//        		this.setPolyLine(latlng, selectedCoordinate, status);
//        		this.setEndPoint(new L.LatLng(selectedStop.lat, selectedStop.lon), false, selectedStop.name, status);
//        	}
//    	}
//    },
//    
//    setPolyLine: function(latlng, approximate, startend){
//    	if(startend == 'start'){
//    		if(this.polyLineStart == null){
//    			this.polyLineStart = new L.Polyline([latlng, approximate]);    			
//    		}
//    		else{
//    			this.polyLineStart.setLatLngs([latlng, approximate]);
//    		}    
//    		this.pathLayer.addLayer(this.polyLineStart);
//    	}
//    	else if(startend == 'end'){
//    		if(this.polyLineEnd == null){
//    			this.polyLineEnd = new L.Polyline([latlng, approximate]);
//    		}
//    		else
//    			this.polyLineEnd.setLatLngs([latlng, approximate]);
//    		this.pathLayer.addLayer(this.polyLineEnd);
//    	}
//    	else{
//    		if(!(startend in this.polyLineOtherEnd)){
//    			this.polyLineOtherEnd[startend] = new L.Polyline([latlng, approximate]);
//    		}
//    		else
//    			this.polyLineOtherEnd[startend].setLatLngs([latlng, approximate]);
//    		this.pathLayer.addLayer(this.polyLineOtherEnd[startend]);
//    	}
//    },
//    
//    removeOrigins: function(index){
//    	if(index == 'start'){
//    		this.markerLayer.removeLayer(this.originStartMarker);
//    		this.pathLayer.removeLayer(this.polyLineStart);
//    		this.originStartMarker = null;
//    		this.polyLineStart = null;
//    	}
//    	else if(index == 'end'){
//    		this.markerLayer.removeLayer(this.originEndMarker);
//    		this.pathLayer.removeLayer(this.polyLineEnd);    		
//    		this.originEndMarker = null;
//    		this.polyLineEnd = null;    		
//    	}
//    	else{
//    		this.markerLayer.removeLayer(this.originOtherEndMarker[index]);
//    		this.pathLayer.removeLayer(this.polyLineOtherEnd[index]);    		
//    		this.originOtherEndMarker.splice(index, 1);
//    		this.polyLineOtherEnd.splice(index, 1);
//    		
//    		//rename the popup of other end markers
//    		var nEnd = this.optionsWidget.controls.location1.nEnd;
//    		for(var i=index; i < nEnd; i++){
//    			var content = this.originOtherEndMarker[i]._popup._content;
//    			var num = content.textContent.charAt(3);
//    			var newText = 'End' + (num-1) + ' (' + content.textContent.split('(')[1];
//    			$(content).find('strong').html(newText);
//    		}
//    	}
//    },
    
    //TODO
    checkLoginStatus: function(){
    	if(this.username != null)
    		return this.username;
    	else{
	    	if(this.webapp.loginWidget.logged_in == false)
	    		return -1;
	    	else
	    		return $('#otp-username :first-child').html();
    	}
    },
    
    restoreTrip : function(queryParams) {    
    	console.log('restore trip in multimodal planner module');
        this.optionsWidget.applyQueryParams(queryParams);
        otp.modules.planner.PlannerModule.prototype.restoreTrip.apply(this, arguments);
    },
       
    clearTrip : function() {
        otp.modules.planner.PlannerModule.prototype.clearTrip.apply(this);
        if(this.itinWidget !== null) {
            this.itinWidget.close();
            this.itinWidget.clear();
            //TRANSLATORS: Widget title
            this.itinWidget.setTitle(_tr("Itineraries"));
        }
 },
        
    CLASS_NAME : "otp.modules.multimodal.MultimodalPlannerModule"
});

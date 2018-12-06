//Shuai (28-07-2017) the widget to select approximate location
//Shuai (22-01-2018) no longer using this selector

//otp.namespace("otp.widgets");
//
//otp.widgets.ApproximateLocationSelector =
//    otp.Class(otp.widgets.Widget, {
//    	
//    control: null,	
//    	
//    allStops: [],
//    
//    latlng: null,
//    startend: null,
//    status: null,
//    	    	
//	initialize : function(id, control, name) {    	
//        var this_ = this;
//        this.control = control;
//        
//        otp.widgets.Widget.prototype.initialize.call(this, id, control, {
//            openInitially : false,
//            title : name
//        });
//        
//        ich['otp-tripOptions-approximateLocationsSelector']({
//            widgetId : this.id,
//            close: 'close',
//        }).appendTo(this.$());
//        
//        $('#' + this.id + '-1').button().click(function(){
//        	this_.control.setApproximateStartEnd(this_.latlng, this_.allStops[0], this_.startend, this_.status);
//        	this_.close();
//        });
//        $('#' + this.id + '-2').button().click(function(){
//        	this_.control.setApproximateStartEnd(this_.latlng, this_.allStops[1], this_.startend, this_.status);
//        	this_.close();
//        });
//		$('#' + this.id + '-3').button().click(function(){
//			this_.control.setApproximateStartEnd(this_.latlng, this_.allStops[2], this_.startend, this_.status);
//			this_.close();
//		});
//		
//		$('#' + this.id + '-close').button().click(function(){
//			this_.close();
//		});
//        
//        this.center();
//	},
//	
//    selectApproximateStartEnd: function(latlng, startend, status){
//    	var this_ = this;
//    	this.latlng = latlng;
//    	this.startend = startend;
//    	this.status = status;
//    	
//    	if(this.allStops.length == 0){
//    		var url = otp.config.hostname + '/' + otp.config.restService + '/index/stops';
//    		$.ajax(url,{
//                success: function(data) {
//                	this_.allStops = data;
//                	this_.sortStopsBasedOnDistance(latlng);                	
//                	//take 3 closest stops
//            		$('#' + this_.id + '-1').html(this_.allStops[0].name).attr('title', this_.getDistanceString(latlng, this_.allStops[0]));
//            		$('#' + this_.id + '-2').html(this_.allStops[1].name).attr('title', this_.getDistanceString(latlng, this_.allStops[1]));
//            		$('#' + this_.id + '-3').html(this_.allStops[2].name).attr('title', this_.getDistanceString(latlng, this_.allStops[2]));
//                }
//    		});
//    	}
//    	else{
//    		this.sortStopsBasedOnDistance(latlng);
//        	//take 3 closest stops
//    		$('#' + this.id + '-1').html(this.allStops[0].name).attr('title', this_.getDistanceString(latlng, this_.allStops[0]));
//    		$('#' + this.id + '-2').html(this.allStops[1].name).attr('title', this_.getDistanceString(latlng, this_.allStops[1]));
//    		$('#' + this.id + '-3').html(this.allStops[2].name).attr('title', this_.getDistanceString(latlng, this_.allStops[2]));
//    	}   	
//    },
//    
//    getDistanceString: function(latlng, stop){
//    	return (latlng.distanceTo(new L.LatLng(stop.lat, stop.lon))/1000).toFixed(2) + 'KM';
//    },
//    
//    sortStopsBasedOnDistance: function(latlng){
//    	var this_ = this;    	    	
//    	this.allStops.sort(function(stop1, stop2){
//    		var distance1 = latlng.distanceTo(new L.LatLng(stop1.lat, stop1.lon));
//    		var distance2 = latlng.distanceTo(new L.LatLng(stop2.lat, stop2.lon));
//    		if(distance1 < distance2)
//    			return -1;
//    		else 
//    			return 1;
//    	});
//    },
//})
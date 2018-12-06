/**
 * Shuai (19-07-2017) Add new gtfs stop
 */

otp.namespace("otp.widgets");

otp.widgets.LocationAdderWidget =
    otp.Class(otp.widgets.Widget, {
    
    control: null,
    stops: [],
    	
    initialize : function(id, control, name) {
    	var this_ = this;
        this.control = control;
        
        otp.widgets.Widget.prototype.initialize.call(this, id, control.gtfsEditor.owner, {
            openInitially : false,
            title : name
        });
        
        ich['otp-gtfsEditor-stopEditor-Adder']({
			location: _tr("Location"),
            latitude: _tr("Latitude"),
            longitude: _tr("Longitude"),
            type: _tr("Type"),
            country: _tr("Country"),
            add: _tr("Add new Location"),
            close: _tr("Close"),
            widgetID: this.id
	    }).appendTo(this.$()); 
        
        //delayed input
        var delay = (function(){
        	var timer = 0;
        	return function(callback, ms){
        		clearTimeout(timer);
        		timer = setTimeout(callback, ms)
        	}
        })();
        
        $('#' + this_.id + '-latitude').keyup(function(){
        	var thisInput = this;
        	delay(function(){
        		var lng = $('#' + this_.id + '-longitude').val()
            	if($.isNumeric(lng) && $.isNumeric($(thisInput).val())){
            		var latlng = new L.LatLng($(thisInput).val(), lng);
            		this_.control.locMarker.setLatLng(latlng);
            		this_.control.gtfsEditor.owner.webapp.map.lmap.panTo(latlng);
            	}
        	}, 1000);
        });
        
        $('#' + this_.id + '-longitude').keyup(function(){
        	var thisInput = this;
        	delay(function(){
	        	var lat = $('#' + this_.id + '-latitude').val()
	        	if($.isNumeric(lat) && $.isNumeric($(thisInput).val())){
		        	var latlng = new L.LatLng($('#' + this_.id + '-latitude').val(), $(thisInput).val());
		        	this_.control.locMarker.setLatLng(latlng);
		        	this_.control.gtfsEditor.owner.webapp.map.lmap.panTo(latlng);
	        	}
        	}, 1000);
        });
        
        $('#' + this.id + '-add').click(function(){
			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/stop/add';
			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
			if(loginStatus != "-1"){
				url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/stop/add';
			}
			var location = $('#' + this_.id + '-location').val();
			var latitude = $('#' + this_.id + '-latitude').val();
			var longitude = $('#' + this_.id + '-longitude').val();
			var type = $('#' + this_.id + '-type').val();
			var country = $('#' + this_.id + '-country').val();
			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
			$.ajax(url, {
				type: 'POST',
				data: JSON.stringify({
					'location': location,
					'latitude': latitude,
					'longitude': longitude,
					'type': type,
					'country': country,
					'username': login,
				}),
				dataType: 'JSON',
				contentType: "application/json",
				
				beforeSend: function(){
					if(location == "" || latitude == "" || longitude == ""){
						otp.widgets.Dialogs.showOkDialog("Please enter location/latitude/longitude", "Error");
						return false;
					}
					if(location.includes('_') || location.includes(':') || location.includes(';') || location.includes('---')){
						otp.widgets.Dialogs.showOkDialog("Location name can't contain '_', ':', ';', '---'", "Error");
						return false;
					}
					if(!$.isNumeric(latitude) || !$.isNumeric(longitude)){
						otp.widgets.Dialogs.showOkDialog("Please enter valid latitude/longitude", "Error");
						return false;
					}
					for(var i=0; i < this_.stops.length; i++){
						if($('#' + this_.id + '-location').val().toUpperCase() == this_.stops[i].name.toUpperCase()){
							otp.widgets.Dialogs.showOkDialog("Stop already exists", "Error");
							return false;
						}
					}
				},
				
				success: function(val){
					switch (val){
						case 0:
							otp.widgets.Dialogs.showOkDialog("New location added", "GTFS updated");
							var desc = "type:custom;country:" + country + ";locationType:" + type;
							var stop = {
								'location': location,
								'latitude': latitude,
								'longitude': longitude,
								'desc': desc,
							}
							this_.control.setStop(stop);
							break;
							
						case -1:
							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
							break;
					}
				},
			});	
        });
        
        $('#' + this.id + '-close').click(function(){
        	this_.clear();
        	$('#' + this_.id + '-location').val('');
    		$('#' + this_.id + '-latitude').val('');
    		$('#' + this_.id + '-longitude').val('');
    		$('#' + this_.id + '-type').val('');
    		$('#' + this_.id + '-country').val('');
        	this_.control.restore();
        });
    },
    
    updateLocation: function(latlng){    	
    	$('#' + this.id + '-latitude').val(latlng.lat);
    	$('#' + this.id + '-longitude').val(latlng.lng);
    },
    
    clear: function(){
    	this.close();
    }
})
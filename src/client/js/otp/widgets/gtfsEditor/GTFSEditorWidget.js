/**
 * Shuai (27-07-2017)
 * GTFS editor widget
 */

//TODO userID from upper level. 

otp.namespace("otp.widgets.gtfsEditor");

otp.widgets.gtfsEditor.gtfsEditorWidget = 
	otp.Class(otp.widgets.Widget, {
		
	title: "GTFS Editor",
	id: null,
	module: null,
	
	controls : null,
	scrollPanel : null,
	 
	initialize : function(id, owner, options) {
		console.log(otp.util.Time.secsToHrMinSecWithSeparator(106200, ':'));
		console.log(otp.util.Time.secsToHrMinSecWithSeparator(156600, ':'));
		
		this.module = owner;
		this.id = id;
		
	    var defaultOptions = {
	    	cssClass : 'otp-defaultGTFSEditorWidget',
            closeable : true,
            minimizable : true,
            persistOnClose: true,
	    };
	    
	    options = (typeof options != 'undefined') ? 
	        _.extend(defaultOptions, options) : defaultOptions;
	        
	    otp.widgets.Widget.prototype.initialize.call(this, id, owner, options);
	    this.mainDiv.addClass('otp-GTFSEditorWidget');
	    
	    this.controls = {};
	    this.center(); 
	},
	
    close : function() {
        if(typeof this.onClose === 'function') this.onClose();
        this.isOpen = false;
        this.hide();
        console.log(this.module.widgets);
    },
    
    addControl : function(id, control, scrollable) {
        if(scrollable) {
            if(this.scrollPanel == null) this.initScrollPanel();
            control.$().appendTo(this.scrollPanel);
        }
        else {
            control.$().appendTo(this.$());
        }
        //$("<hr />").appendTo(this.$());
        control.doAfterLayout();
        this.controls[id] = control;
    },
    
    initScrollPanel : function() {
        this.scrollPanel = $('<div id="'+this.id+'-scollPanel" class="notDraggable" style="overflow: auto;"></div>').appendTo(this.$());
        this.$().resizable({
            minHeight: 80,
            alsoResize: this.scrollPanel
        });
    },
    
    addSeparator : function(scrollable) {
        var hr = $("<hr />")
        if(scrollable) {
            if(this.scrollPanel == null) this.initScrollPanel();
            hr.appendTo(this.scrollPanel);
        }
        else {
            hr.appendTo(this.$());
        }
    },
    
    addVerticalSpace : function(pixels, scrollable) {
        var vSpace = $('<div style="height: '+pixels+'px;"></div>');
        if(scrollable) {
            if(this.scrollPanel == null) this.initScrollPanel();
            vSpace.appendTo(this.scrollPanel);
        }
        else {
            vSpace.appendTo(this.$());
        }
    },
	
	doAfterLayout : function(){
		
	},
	
	CLASS_NAME : "otp.widgets.gtfsEditor"
});


//control class
otp.widgets.gtfsEditor.gtfsEditorWidgetControl = otp.Class({
   
	div :   null,
	gtfsEditor : null,

    initialize : function(gtfsEditor) {
        this.gtfsEditor = gtfsEditor;
        this.div = document.createElement('div');
        //this.div.className()
    },

    setContent : function(content) {
        this.div.innerHTML = content;
    },

    doAfterLayout : function() {
    },

    restorePlan : function(data) {
    },

    $ : function() {
        return $(this.div);
    }
});


otp.widgets.gtfsEditor.control = 
	otp.Class(otp.widgets.gtfsEditor.gtfsEditorWidgetControl, {
	
	id : null,
	
	tabContent: [],
	activeContent: null,
	
	stopEditor: null,
	routeEditor: null,
	serviceEditor: null,

	controlPadding: '8px',
	
	initialize : function(gtfsEditor) {
    	var this_ = this;
    	otp.widgets.gtfsEditor.gtfsEditorWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = gtfsEditor.id+"-editorControl";
        
	    ich['otp-gtfsEditor']({
	    	widgetID: this.id,
	    	stops: _tr("Stops"),
	    	routes: _tr("Routes"),
	    	services: _tr("Services"),
	    	reload: _tr("Reload"),
	    }).appendTo(this.$()); 
	    
	    this.stopEditor = new otp.widgets.gtfsEditor.stopEditor(gtfsEditor, this);
	    this.routeEditor = new otp.widgets.gtfsEditor.routeEditor(gtfsEditor, this);
	    this.serviceEditor = new otp.widgets.gtfsEditor.serviceEditor(gtfsEditor, this);
	    
	    this.tabContent.push(this.stopEditor);
	    this.tabContent.push(this.routeEditor);
	    this.tabContent.push(this.serviceEditor);
	    
	    this.activeContent = this.tabContent[0].id;
	    console.log(this.activeContent);
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		$('#' + this.id + '-stop').addClass('active');
		
		for(var i=0; i < this.tabContent.length; i++){
			this.tabContent[i].$().prepend($('<div style="height: '+this.controlPadding+';"></div>'));
			this.tabContent[i].$().attr('id', this.tabContent[i].id).addClass('otp-gtfs-editorControl-content').appendTo($('#' + this.id + '-container'));
			this.tabContent[i].doAfterLayout();
		}
		
		this.tabContent[0].$().addClass('active');
		
		$('#' + this.id + '-tabs li').click(function(){
			var selector = $(this).attr('href');
			$('#otp-gtfs-editorControl-container .active').removeClass('active');
			$('#' + selector).addClass('active');
			
			$('#otp-gtfs-editorControl-tabs .active').removeClass('active');
			$(this).addClass('active');
			
			for(var i=0; i < this_.tabContent.length; i++){
				if(this_.tabContent[i].id == this_.activeContent)
					this_.tabContent[i].clear();
			};
			this_.activeContent = selector;
			console.log(this_.activeContent);
			//TODO change the tab restore the previous result
			for(var i=0; i < this_.tabContent.length; i++){
				if(this_.tabContent[i].id == this_.activeContent)
					this_.tabContent[i].restore();
			};
		});
		
		$('#' + this.id + '-reload').click(function(){
//			otp.widgets.Dialogs.showYesNoDialog("Reload Server?", "Reload", function(){
//				var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/reload';
//				var loginStatus = this_.gtfsEditor.owner.checkLoginStatus();
//				if(loginStatus != "-1"){
//					console.log("loged in");
//					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/reload';
//				}
//				$.ajax(url, {
//					type: 'POST',
//					dataType: 'JSON',
//					contentType: "application/json",
//					success: function(data) {
//						console.log('reloaded');
//					}
//				})
//			})
			otp.widgets.Dialogs.showYesNoDialog("Reload Graph?", "Reload", function(){
				$('#otp-startupSpinner').show();
				var url = otp.config.hostname + '/' + otp.config.restService;
				var loginStatus = this_.gtfsEditor.owner.checkLoginStatus();
				if(loginStatus != "-1"){
					console.log("loged in");
					url = otp.config.hostname + '/otp/routers/' + loginStatus;
				}
				$.ajax(url, {
					type: 'PUT',
					dataType: 'text',
					contentType: "application/json",
					success: function(data) {
						$('#otp-startupSpinner').hide();
						otp.widgets.Dialogs.showOkDialog(data, "Graph Reload");
					}
				})
			})
		});
	},
})


otp.widgets.gtfsEditor.stopEditor = 
	otp.Class(otp.widgets.gtfsEditor.gtfsEditorWidgetControl, {
	
	id : null,
	gtfsEditor: null,
	control: null,
	
	adderWidget: null,
	stops: [],
	customizedStops: [],
	
	locMarker: null,
	
	initialize : function(gtfsEditor, control) {
    	var this_ = this;
    	this.gtfsEditor = gtfsEditor;
    	this.control = control;
    	otp.widgets.gtfsEditor.gtfsEditorWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = gtfsEditor.id+"-stopEditor";
        
	    ich['otp-gtfsEditor-stopEditor']({
			location:  _tr("Location"),
            latitude:  _tr("Latitude"),
            longitude:  _tr("Longitude"),
            type: _tr("Type"),
            country: _tr("Country"),
            save:  _tr("Save"),
            remove:  _tr("Remove"),
            widgetID: this.id
	    }).appendTo(this.$());    
	    	    
	    var startLatLng = this.gtfsEditor.owner.webapp.map.lmap.getCenter();
        this.locMarker = new L.Marker(startLatLng, {draggable: true});
        this.gtfsEditor.owner.markerLayer.addLayer(this.locMarker);
	    
	    this.adderWidget = new otp.widgets.LocationAdderWidget(this.id + '-adderWidget', this, _tr('Location Adder'));
	},
   
	doAfterLayout : function(){
		var this_ = this;
		$('#' + this.id + '-info').addClass('hideInfo');
		$('#' + this.id + '-location').prop('disabled',true);
		
		this.locMarker.on('dragend', function() {
            this_.gtfsEditor.owner.webapp.hideSplash();
            var LatLng = this_.locMarker.getLatLng();
            if(this_.adderWidget.isOpen)
            	this_.adderWidget.updateLocation(LatLng);
            else{
            	$('#' + this_.id + '-latitude').val(LatLng.lat);
            	$('#' + this_.id + '-longitude').val(LatLng.lng);
            }
        });
		
		//delayed input
        var delay = (function(){
        	var timer = 0;
        	return function(callback, ms){
        		clearTimeout(timer);
        		timer = setTimeout(callback, ms)
        	}
        })();
		
        $('#' + this.id + '-latitude').keyup(function(){
        	var thisInput = this;
        	delay(function(){
	        	var lng = $('#' + this_.id + '-longitude').val()
	        	if($.isNumeric(lng) && $.isNumeric($(thisInput).val())){
	        		var latlng = new L.LatLng($(thisInput).val(), lng);
	        		this_.locMarker.setLatLng(latlng);
	        		this_.gtfsEditor.owner.webapp.map.lmap.panTo(latlng);
	        	}
        	}, 1000);
        });
        
        $('#' + this.id + '-longitude').keyup(function(){
        	var thisInput = this;
        	delay(function(){
	        	var lat = $('#' + this_.id + '-latitude').val()
	        	if($.isNumeric(lat) && $.isNumeric($(thisInput).val())){
		        	var latlng = new L.LatLng($('#' + this_.id + '-latitude').val(), $(thisInput).val());
		        	this_.locMarker.setLatLng(latlng);
		        	this_.gtfsEditor.owner.webapp.map.lmap.panTo(latlng);
	        	}
        	}, 1000);
        });
        
        $('<option selected disabled>Select stop</option>').appendTo($('#otp-gtfs-stopEditor-stopList'));		
		var url = otp.config.hostname + '/' + otp.config.restService + '/index/stops';
		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
		if(loginStatus != "-1"){
			console.log("loged in");
			url = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/stops';
		}
		$.ajax(url,{
            success: function(data) {
            	this_.stops = data;
            	
            	this_.sortStops();
            	
            	for(var i=0; i < data.length; i++){
            		if(data[i].desc.split(';')[0].split(':')[1] == 'custom')
            			this_.customizedStops.push(data[i]);
            	}
            	console.log(this_.customizedStops);
            	
            	for(var i=0; i < this_.stops.length; i++){
            		$('<option>' + this_.stops[i].name + '</option>').appendTo($('#otp-gtfs-stopEditor-stopList'));
            	}
            	
            	$('#otp-gtfs-stopEditor-stopList').change(function(){
            		this_.adderWidget.clear();
            		$('#' + this_.id + '-info').removeClass('hideInfo');
            		
            		var index = this.selectedIndex -1;
            		var content = this_.stops[index];

            		var latlng = new L.LatLng(content.lat, content.lon);
            		this_.locMarker.setLatLng(latlng);
            		this_.gtfsEditor.owner.webapp.map.lmap.panTo(latlng);

            		$('#' + this_.id + '-latitude').val(content.lat);
            		$('#' + this_.id + '-longitude').val(content.lon);
            		$('#' + this_.id + '-country').val(content.desc.split(';')[1].split(':')[1]);
            		$('#' + this_.id + '-type').val(content.desc.split(';')[2].split(':')[1]);
            		
            		if(!this_.customizedStops.includes(content)){
            			$('#' + this_.id + '-location').val(content.name + "---(core location: lat/lon not changeable)");
            			$('#' + this_.id + '-latitude').prop('disabled',true);
            			$('#' + this_.id + '-longitude').prop('disabled',true);
            			this_.locMarker.dragging.disable();
            		}
            		else{
            			$('#' + this_.id + '-location').val(content.name);
            			$('#' + this_.id + '-latitude').removeProp('disabled');
            			$('#' + this_.id + '-longitude').removeProp('disabled');
            			this_.locMarker.dragging.enable();
            		}
            	});

            	$('#' + this_.id + '-remove').click(function(){
        			otp.widgets.Dialogs.showYesNoDialog("You will also lose all the routes connected to this stop. Continue?", "Delete stop", function(){
        				var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/stop/remove';
        				var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/stop/remove';
        				}
        				var location = $('#' + this_.id + '-location').val().split('---')[0];
        				var latitude = $('#' + this_.id + '-latitude').val();
        				var longitude = $('#' + this_.id + '-longitude').val();
        				var login = this_.control.gtfsEditor.owner.checkLoginStatus();
        				$.ajax(url, {
        					type: 'POST',
        					data: JSON.stringify({
        						'location': location,
        						'latitude': latitude,
        						'longitude': longitude,
        						'username': login,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",
        					
        					beforeSend: function(){
        						//check if the stop is core location
        						if($('#' + this_.id + '-latitude').prop('disabled')){
        							otp.widgets.Dialogs.showOkDialog("Can not delete location from core GTFS", "Error");
        							return false;
        						}
        					},
        					
        					success: function(val){
        						switch (val){
        						case 0:        							
        							otp.widgets.Dialogs.showOkDialog("Stop deleted", "GTFS updated");
        							var index = $('#otp-gtfs-stopEditor-stopList').prop('selectedIndex') -1;
        							console.log($('#otp-gtfs-stopEditor-stopList').prop('selectedIndex'));
        							console.log(index);
        							console.log(this_.stops[index]);        							
        							
        							$('#otp-gtfs-stopEditor-stopList option').each(function(){
        								if($(this).val() == this_.stops[index].name){
        									console.log($(this).val());
        									$(this).remove();
        								}
        							});
        							
        							for(var i = this_.stops.length-1; i >= 0; i--){
        								if(this_.stops[i].name == location)
        									this_.stops.splice(i, 1);
        							}
        							for(var i = this_.customizedStops.length-1; i >= 0; i--){
        								if(this_.customizedStops[i].name == location)
        									this_.customizedStops.splice(i, 1);
        							}
        							console.log(this_.stops);
        							console.log(this_.customizedStops);
        							this_.cleanPanel();
        							
        							//at this point, routes should be modified since the stop is removed
        							this_.control.routeEditor.deleteRoutesForStop(location);

        							break;
        							
        						case -1:
        							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        							break;
        						}
        					},
        				})
        			});
        		});
            	            	
            	$('#' + this_.id + '-save').click(function(){
            		otp.widgets.Dialogs.showYesNoDialog("Save your editing?", "Update", function(){
            			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/stop/edit';
            			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/stop/edit';
        				}
            			var location = $('#' + this_.id + '-location').val().split('---')[0];
            			var latitude = $('#' + this_.id + '-latitude').val();
            			var longitude = $('#' + this_.id + '-longitude').val();
            			var type = $('#' + this_.id + '-type').val();
            			var country = $('#' + this_.id + '-country').val();
            			var gtfs;
            			for(var i=0; i < this_.stops.length; i++)
            				if(this_.stops[i].name == location)
            					gtfs = this_.stops[i].desc.split(';')[0];
            			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
        				$.ajax(url, {
        					type: 'POST',
        					data: JSON.stringify({
        						'location': location,
        						'latitude': latitude,
        						'longitude': longitude,
        						'type': type,
        						'country': country,
        						'gtfs': gtfs,
        						'username': login,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",
        					
        					beforeSend: function(){
        						if(latitude == "" || longitude == ""){
        							otp.widgets.Dialogs.showOkDialog("Please enter latitude/longitude", "Error");
        							return false;
        						}
        						if(!$.isNumeric(latitude) || !$.isNumeric(longitude)){
        							otp.widgets.Dialogs.showOkDialog("Please enter valid latitude/longitude", "Error");
        							return false;
        						}
        					},
        					
        					success: function(val){
        						switch (val){
        						case 0:
        							otp.widgets.Dialogs.showOkDialog("Stop updated", "GTFS updated");
        							var index = $('#otp-gtfs-stopEditor-stopList').prop('selectedIndex') -1;   
        							console.log($('#otp-gtfs-stopEditor-stopList').prop('selectedIndex'));
        							console.log(index);
        							console.log(this_.stops[index]);
        							
        							this_.stops[index].lat = latitude;
        							this_.stops[index].lon = longitude;        							
        							this_.stops[index].desc = this_.stops[index].desc.split(';')[0] + ";country:" + country + ";locationType:" + type;
        							
        							for(var i = this_.customizedStops.length-1; i >= 0; i--){
        								if(this_.customizedStops[i].name == location){
        									this_.customizedStops[i].lat = latitude;
        									this_.customizedStops[i].lon = longitude;
        									this_.customizedStops[i].desc = this_.stops[index].desc;
        								}        								
        							}
        							
        							var latlng = new L.LatLng(this_.stops[index].lat, this_.stops[index].lon);
        							this_.locMarker.setLatLng(latlng);
        							break;
        							
        						case -1:
        							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        							break;
        						}
        					},
        				})
            		})
            	});
            	
            	
            	$('#' + this_.id + '-add').attr('title', 'Create a new stop').click(function(){
            		this_.cleanPanel();
            		this_.gtfsEditor.close();
            		
            		this_.locMarker.dragging.enable();
            		            		
            		this_.adderWidget.stops = this_.stops;
            		this_.adderWidget.show();
            		if(this_.adderWidget.isMinimized) this_.adderWidget.unminimize();
                    this_.adderWidget.bringToFront();
            	});
            }
		});
	},
	
	sortStops: function(){
    	this.stops.sort(function(data1, data2){
    		if(data1.name > data2.name)
    			return 1;
    		else 
    			return -1;
    	});
	},
	
	cleanPanel: function(){
		$('#otp-gtfs-stopEditor-stopList option').eq(0).prop('selected', true);
		$('#' + this.id + '-location').val('');
		$('#' + this.id + '-latitude').val('');
		$('#' + this.id + '-longitude').val('');
		$('#' + this.id + '-type').val('');
		$('#' + this.id + '-country').val('');
	},
	
	setStop: function(stop){
		var content = {
			'name': stop.location,
			'lat': stop.latitude,
			'lon': stop.longitude,
			'desc': stop.desc,
		}
		this.stops.push(content);
		this.customizedStops.push(content);
		this.adderWidget.stops = this.stops;
		$('<option>' + stop.location + '</option>').appendTo($('#otp-gtfs-stopEditor-stopList'));
	},
	
	restore: function(){
		console.log("restore stop eidtor");
		var startLatLng = this.gtfsEditor.owner.webapp.map.lmap.getCenter();
        this.locMarker.setLatLng(startLatLng);
		this.gtfsEditor.owner.markerLayer.addLayer(this.locMarker);
		this.gtfsEditor.show();
		$('#' + this.id + '-info').addClass('hideInfo');
		
	},
	
	resetStops: function(data){
		$('#otp-gtfs-stopEditor-stopList option :gt(0)').remove();
		this.stops = data;
		
		this.customizedStops = [];
		for(var i=0; i < this.stops.length; i++){
    		if(this.stops[i].desc.split(';')[0].split(':')[1] == 'custom')
    			this.customizedStops.push(this.stops[i]);
    	}
    	
    	for(var i=0; i < this.stops.length; i++){
    		$('<option>' + this.stops[i].name + '</option>').appendTo($('#otp-gtfs-stopEditor-stopList'));
    	}
	},
	
	clear: function(){
		console.log("clear stop editor");
		this.adderWidget.clear();
		this.gtfsEditor.owner.markerLayer.removeLayer(this.locMarker);
		this.cleanPanel();
	},
})


otp.widgets.gtfsEditor.routeEditor = 
	otp.Class(otp.widgets.gtfsEditor.gtfsEditorWidgetControl, {
	
	id : null,
	gtfsEditor: null,
	control: null,
	
	adderWidget: null,
	shapeWidget: null,
	
	markers: [],
	points: [],
	
	startPoint: null,
	endPoint: null,
	newPoint: null,
	
	routes: [],	
	customizedRoutes: [],
	polyline: null,
	
	isSingleDate: false,
	
	initialize : function(gtfsEditor, control) {
    	var this_ = this;
    	this.gtfsEditor = gtfsEditor;
    	this.control = control;
    	otp.widgets.gtfsEditor.gtfsEditorWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = gtfsEditor.id+"-routeEditor";
        
	    ich['otp-gtfsEditor-routeEditor']({
			routes:  _tr("Route"),
            from:  _tr("From"),
            to:  _tr("To"),
            mode: _tr("Mode"),
            agency: _tr("Agency"),
            service: _tr("Service"),
            arrive: _tr("Arrival Time"),
            departure: _tr("Departure Time"),
            frequency: _tr("Frequency"),
            startTime: _tr("startTime"),
            endTime: _tr("endTime"),
            headway: _tr("headway"),
            save:  _tr("Save"),
            remove:  _tr("Remove"),
            shape: _tr("Shape"),
            widgetID: this.id
	    }).appendTo(this.$());	    
        
	    this.adderWidget = new otp.widgets.RouteAdderWidget(this.id + '-adderWidget', this, _tr('Route Adder'));
	    this.shapeWidget = new otp.widgets.ShapeOrderWidget(this.id + '-shapeWidget', this, _tr('Shape Drawer'));
	},
   
	doAfterLayout : function(){
		var this_ = this;
		
		$('#' + this.id + '-info').addClass('hideInfo');
		$('#' + this.id + '-name').prop('disabled',true);
		$('#' + this.id + '-from').prop('disabled',true);
		$('#' + this.id + '-to').prop('disabled',true);
		$('#' + this.id + '-mode').prop('disabled',true);
		$('#' + this.id + '-agency').prop('disabled',true);
		
		$('#' + this.id + '-arrive').attr("placeholder", "HH:MM:SS");
		$('#' + this.id + '-departure').attr("placeholder", "HH:MM:SS");
		
		$('#' + this.id + '-frequencyCheckbox').change(function(){
			if($(this).prop("checked")){
				var div = this_.$().find('div[name="f"]');
				for(var i=0; i<div.length; i++)
					$(div[i]).css('display', 'block');
			}
			else{
				var div = this_.$().find('div[name="f"]');
				for(var i=0; i<div.length; i++)
					$(div[i]).css('display', 'none');
			}
		});
		$('#' + this.id + '-startTime').attr("placeholder", "HH:MM:SS");
		$('#' + this.id + '-endTime').attr("placeholder", "HH:MM:SS");
		
		$('#' + this_.id + '-service').change(function(){
			//if the service has only 1 fixed date, change the view of the arrive time
			console.log($(this).val());
			var dates = [];
			var services = this_.control.serviceEditor.services;
			var calendarDates = this_.control.serviceEditor.calendarDates;
			for(var i=0; i < services.length; i++){
				if(services[i].serviceId == $(this).val()){
					if(!('monday' in services[i])){
						//the service doesnt contain the weekly periodic calendar
						console.log($(this).val() + " has no weekly periodic calendar");
						for(var j=0; j < calendarDates.length; j++){
							if(calendarDates[j].serviceId == $(this).val()){
								dates.push(calendarDates[j]);
							}
						}
						if(dates.length == 1){
							//service with only 1 fixed date
							this_.isSingleDate = true;
							var temp = (dates[0].date.month < 10 ? "0"+dates[0].date.month : dates[0].date.month) + '/' + (dates[0].date.day < 10 ? "0"+dates[0].date.day : dates[0].date.day) + '/' + dates[0].date.year
							$('#' + this_.id + '-departureDate').val(temp);
							$('#' + this_.id + '-arriveDate').datepicker("setDate", temp);
							this_.$().find('div[name="multipleDates"]').each(function(){
								$(this).css("display", "none");
							});
							this_.$().find('div[name="singleDate"]').each(function(){
								$(this).css("display", "block");
							});
							$('#' + this_.id + '-departure').val('');
							$('#' + this_.id + '-arrive').val('');
							$('#' + this_.id + '-arriveDays').val('');
						}
						else{
							//service with several fixed dates 
							this_.isSingleDate = false;
							this_.$().find('div[name="multipleDates"]').each(function(){
								$(this).css("display", "block");
							});
							this_.$().find('div[name="singleDate"]').each(function(){
								$(this).css("display", "none");
							});
							$('#' + this_.id + '-departureTime').val('');
							$('#' + this_.id + '-arriveTime').val('');
						}
					}
					else{
						//the service contains periodic calendar
						this_.isSingleDate = false;
						this_.$().find('div[name="multipleDates"]').each(function(){
							$(this).css("display", "block");
						});
						this_.$().find('div[name="singleDate"]').each(function(){
							$(this).css("display", "none");
						});
						$('#' + this_.id + '-departureTime').val('');
						$('#' + this_.id + '-arriveTime').val('');
					}
					break;
				}
			}
		});
		
		$('#' + this_.id + '-departureDate').prop('disabled', true);
		$('#' + this_.id + '-departureTime').attr("placeholder", "HH:MM:SS");
		$('#' + this_.id + '-arriveDate').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
            	console.log(date);
            },
		});
		$('#' + this_.id + '-arriveTime').attr("placeholder", "HH:MM:SS");
		
		$('<option selected disabled>Select route</option>').appendTo($('#otp-gtfs-routeEditor-routeList'));
		var url = otp.config.hostname + '/' + otp.config.restService + '/index/routes';
		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
		if(loginStatus != "-1"){
			url = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/routes';
		}
		$.ajax(url,{
            success: function(data) {
            	this_.routes = data;            	
            	console.log(data);

            	//sort the data if necessary
            	this_.sortRoutes(); 
            	console.log(this_.routes);
            	
            	for(var i=0; i < data.length; i++){
            		if(data[i].desc.split(';')[0].split(':')[1] == 'custom')
            			this_.customizedRoutes.push(data[i]);
            	}
            	console.log(this_.customizedRoutes);

            	for(var i=0; i < this_.routes.length; i++){
            		$('<option>' + (this_.routes[i].id.split(':')[1]) + '</option>').appendTo($('#otp-gtfs-routeEditor-routeList'));
            	}
            	
            	$('#otp-gtfs-routeEditor-routeList').change(function(){
            		this_.clearMap();
            		this_.shapeWidget.cleanTable();
            		this_.adderWidget.clear();
            		$('#' + this_.id + '-info').removeClass('hideInfo');
            		
            		$('#otp-gtfs-routeEditor-service option').eq(0).prop('selected', true);
            		
            		if($('#' + this_.id + '-frequencyCheckbox').prop("checked"))
            			$('#' + this_.id + '-frequencyCheckbox').click();
            		
            		$('#' + this_.id + '-startTime').val('');
            		$('#' + this_.id + '-endTime').val('');
            		$('#' + this_.id + '-headway').val('');
            		
            		$('#' + this_.id + '-departure').val('');
            		$('#' + this_.id + '-arriveDays').val('');
            		$('#' + this_.id + '-arrive').val('');
            		$('#' + this_.id + '-arriveTime').val('');
            		$('#' + this_.id + '-departureTime').val('');
            		$('#' + this_.id + '-arriveDate').datepicker("setDate", new Date());
        			            		
            		if($('#' + this_.id + '-save').prop('disabled'))
            			this_.enableButton();
            			
            		var index = this.selectedIndex -1;
            		var content = this_.routes[index];
            		
            		$('#' + this_.id + '-from').val(content.shortName.split('_')[0].trim());
            		$('#' + this_.id + '-to').val(content.shortName.split('_')[1].trim());
            		//TODO modify mode
            		$('#' + this_.id + '-mode').val(content.mode);
            		$('#' + this_.id + '-agency').val(content.agencyName);
            		
            		//TODO core/customized gtfs
            		if(!this_.customizedRoutes.includes(content)){
            			$('#' + this_.id + '-name').val(content.id.split(':')[1] + "---(core route)");
//            			$('#' + this_.id + '-latitude').prop('disabled',true);
//            			$('#' + this_.id + '-longitude').prop('disabled',true);
            		}
            		else{
            			$('#' + this_.id + '-name').val(content.id.split(':')[1]);
//            			$('#' + this_.id + '-latitude').removeProp('disabled');
//            			$('#' + this_.id + '-longitude').removeProp('disabled');
            		}
            		
            		//obtain more info about trip/stoptime/frequency
            		var u = otp.config.hostname + '/' + otp.config.restService + '/index/routes/' + content.id + '/trips';       
            		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
            		if(loginStatus != "-1"){
            			u = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/routes/' + content.id + '/trips';
            		}
            		$.ajax(u, {
            			success: function(data) {
            				console.log("new");
            				console.log(data);
            				$('#' + this_.id + '-service').val(data[0].serviceId);
            				
            				//get the shape of the route
            				var u2 = otp.config.hostname + '/' + otp.config.restService + '/index/trips/' + data[0].id + '/geometry';
                    		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
                    		if(loginStatus != "-1"){
                    			u2 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/trips/' + data[0].id + '/geometry';
                    		}
            				$.ajax(u2, {
            					success: function(data) {
            						this_.points = otp.util.Geo.decodePolyline(data.points);
            						console.log(this_.points);
            						this_.startPoint = this_.points[0];
            						this_.endPoint = this_.points[this_.points.length-1];
            						this_.gtfsEditor.owner.webapp.map.lmap.panTo(this_.startPoint);
            						this_.drawRoute();
            					},
            				});
            				
                    		//get the possible frequency data of the route
            				var u2 = otp.config.hostname + '/' + otp.config.restService + '/index/frequency/' + data[0].id.split(':')[1];
                    		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
                    		if(loginStatus != "-1"){
                    			u2 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/frequency/' + data[0].id.split(':')[1];
                    		}
            				$.ajax(u2, {
            					success: function(data) {
            						console.log(data);
            						if(data != ''){
            							console.log("frequency exists");
            							$('#' + this_.id + '-frequencyCheckbox').click();
            							$('#' + this_.id + '-headway').val(data.headwaySecs/60);
            							$('#' + this_.id + '-startTime').val(otp.util.Time.secsToHrMinSecWithSeparator(data.startTime, ':'));
            							$('#' + this_.id + '-endTime').val(otp.util.Time.secsToHrMinSecWithSeparator(data.endTime, ':'));
            						}
            						else{
            							console.log("no frequency exists");
            						}
            					},
            				});
            				
                    		//get the stop times of the route 
            				var u2 = otp.config.hostname + '/' + otp.config.restService + '/index/trips/' + data[0].id + '/stoptimes';
                    		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
                    		if(loginStatus != "-1"){
                    			u2 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/trips/' + data[0].id + '/stoptimes';
                    		}
            				$.ajax(u2, {
            					success: function(data2) {
            						//get the corresponding service info to check if the service is single fixed date or not
            						var temp = $('#' + this_.id + '-service').val().split(':');
            						var agencyAndId = temp[0] + '_' + temp[1];
            						var u3 = otp.config.hostname + '/' + otp.config.restService + '/index/services/' + agencyAndId;
                            		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
                            		if(loginStatus != "-1"){
                            			u3 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/services/' + agencyAndId;
                            		}
            						$.ajax(u3, {
            							success: function(data3){
            								console.log(data3);
            								if(data3 == ''){
            									//check if the service includes multiple fixed dates
            									console.log("not periodic calendar");
            									var u4 = otp.config.hostname + '/' + otp.config.restService + '/index/calendarDates/' + agencyAndId;
                                        		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
                                        		if(loginStatus != "-1"){
                                        			u4 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/calendarDates/' + agencyAndId;
                                        		}
            									$.ajax(u4, {
            										success: function(data4){
            											console.log(data4);
            											if(data4.length == 1){
            												//single fixed date
            												console.log("fixed date!!!!");
            												console.log(data2);
            												var dDate = data4[0].date.month + '/' + data4[0].date.day + '/' + data4[0].date.year;
            												$('#' + this_.id + '-departureDate').val(dDate);
                                    						$('#' + this_.id + '-departureTime').val(otp.util.Time.secsToHrMinSecWithSeparator(data2[0].scheduledDeparture, ':'));
                                    						//arriveDate time
                                    						var temp = otp.util.Time.secsToDhms(data2[0].scheduledDeparture, data2[1].scheduledArrival, ':');
                                    						var aDate = new Date(dDate);
                                    						aDate.setDate(aDate.getDate() + parseInt(temp.split("+")[1]));
                                    						$('#' + this_.id + '-arriveDate').datepicker("setDate", aDate);
                                    						$('#' + this_.id + '-arriveTime').val(temp.split("+")[0]);
            												
            												this_.isSingleDate = true;
            												this_.$().find('div[name="multipleDates"]').each(function(){
            													$(this).css("display", "none");
            												});
            												this_.$().find('div[name="singleDate"]').each(function(){
            													$(this).css("display", "block");
            												});
            											}
            											else{
            												//multiple fixed dates
                                    						console.log(data2);
                                    						$('#' + this_.id + '-departure').val(otp.util.Time.secsToHrMinSecWithSeparator(data2[0].scheduledDeparture, ':'));
                                    						//arrive arriveDays      
                                    						var temp = otp.util.Time.secsToDhms(data2[0].scheduledDeparture, data2[1].scheduledArrival, ':');
                                    						$('#' + this_.id + '-arrive').val(temp.split('+')[0]);            												
                                    						$('#' + this_.id + '-arriveDays').val(temp.split('+')[1]);
                                    						
            												this_.isSingleDate = false;
            												this_.$().find('div[name="multipleDates"]').each(function(){
            													$(this).css("display", "block");
            												});
            												this_.$().find('div[name="singleDate"]').each(function(){
            													$(this).css("display", "none");
            												});
            											}
            										}
            									});
            								}
            								else{
            									//periodic calendar: keep the original panel
            									console.log("periodic calendar");
                        						console.log(data2);
                        						$('#' + this_.id + '-departure').val(otp.util.Time.secsToHrMinSecWithSeparator(data2[0].scheduledDeparture, ':'));
                        						//arrive arriveDays
                        						var temp = otp.util.Time.secsToDhms(data2[0].scheduledDeparture, data2[1].scheduledArrival, ':');
                        						$('#' + this_.id + '-arrive').val(temp.split('+')[0]);
                        						$('#' + this_.id + '-arriveDays').val(temp.split('+')[1]);
                        						
                        						this_.isSingleDate = false;
                    							this_.$().find('div[name="multipleDates"]').each(function(){
                    								$(this).css("display", "block");
                    							});
                    							this_.$().find('div[name="singleDate"]').each(function(){
                    								$(this).css("display", "none");
                    							});
            								}
            							},
            						});
            					},
            				});
            			},
            		})
            	});
            	
            	$('#' + this_.id + '-shape').click(function(){
            		this_.shapeWidget.show();
            		if(this_.shapeWidget.isMinimized) this_.shapeWidget.unminimize();
                    this_.shapeWidget.bringToFront();
            	});
            	
            	$('#' + this_.id + '-remove').click(function(){
        			otp.widgets.Dialogs.showYesNoDialog("Delete this route?", "Remove", function(){
        				var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/route/remove';
        				var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/route/remove';
        				}
        				var routeId = $('#' + this_.id + '-name').val().split('---')[0];
        				var login = this_.control.gtfsEditor.owner.checkLoginStatus();
        				$.ajax(url, {
        					type: 'POST',
        					data: JSON.stringify({
        						'routeId': routeId,
        						'username': login,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",
        					
        					beforeSend: function(){
        						if($('#' + this_.id + '-name').val().includes('---')){
        							otp.widgets.Dialogs.showOkDialog("Can not delete route from core GTFS", "Error");
        							return false;
        						}
        					},
        					
        					success: function(val){
        						switch (val){
        						case 0:        							
        							otp.widgets.Dialogs.showOkDialog("Route deleted", "GTFS updated");
        							
        							var index = $('#otp-gtfs-routeEditor-routeList').prop('selectedIndex') -1;   
        							console.log(this_.routes[index]);
        							
        							$('#otp-gtfs-routeEditor-routeList option').each(function(){
        								if($(this).val() == routeId){
        									console.log($(this).val());
        									$(this).remove();
        								}
        							});        							
        							this_.routes.splice(index, 1);
        							for(var i = this_.customizedRoutes.length-1; i >= 0; i--){
        								if(this_.customizedRoutes[i].id.split(':')[1] == routeId)
        									this_.customizedRoutes.splice(i, 1);
        							}
        							console.log(this_.routes);
        							console.log(this_.customizedRoutes);
        							
        							this_.cleanPanel();
            						this_.clearMap();
        							break;
        							
        						case -1:
        							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        							break;
        						}
        					},
        				})
        			})
            	});
            	
            	$('#' + this_.id + '-save').click(function(){
            		otp.widgets.Dialogs.showYesNoDialog("Save your editing?", "Update", function(){
            			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/route/edit';
            			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/route/edit';
        				}
            			var routeId = $('#' + this_.id + '-name').val().split('---')[0];
            			var from = $('#' + this_.id + '-from').val();
            			var to = $('#' + this_.id + '-to').val();
            			var mode = $('#' + this_.id + '-mode').val();
            			var agency = $('#' + this_.id + '-agency').val();
            			
            			var arriveDate;
            			var departure, arrive, arriveDays;
            			if(this_.isSingleDate){
            				departure = $('#' + this_.id + '-departureTime').val();
            				arrive = $('#' + this_.id + '-arriveTime').val();		
            				arriveDate = $('#' + this_.id + '-arriveDate').val();
            				arriveDays = ((new Date(arriveDate).getTime()/1000) - (new Date($('#' + this_.id + '-departureDate').val()).getTime()/1000))/3600/24;
            			}
            			else{
            				departure = $('#' + this_.id + '-departure').val();
            				arrive = $('#' + this_.id + '-arrive').val();				
            				arriveDays = $('#' + this_.id + '-arriveDays').val() == '' ? 0 : $('#' + this_.id + '-arriveDays').val();
            			}
            			
            			var service = $('#' + this_.id + '-service').val();
            			
            			var frequency;
            			var startTime = $('#' + this_.id + '-startTime').val();
            			var endTime = $('#' + this_.id + '-endTime').val();
            			var headway = $('#' + this_.id + '-headway').val()*60;
            			if($('#' + this_.id + '-frequencyCheckbox').prop("checked"))
            				frequency = true;
            			else
            				frequency = false;
            			
            			var index = $('#otp-gtfs-routeEditor-routeList').prop('selectedIndex') -1;
            			var gtfs = this_.routes[index].desc.split(';')[0].split(':')[1];
            			
            			for(var i=0; i < this_.control.stopEditor.stops.length; i++){
            				var t = this_.control.stopEditor.stops[i];
            				if(t.name == from){
            					this_.points[0].lat = t.lat;
            					this_.points[0].lng = t.lon;
            				}
            				if(t.name == to){
            					this_.points[this_.points.length-1].lat = t.lat;
            					this_.points[this_.points.length-1].lng = t.lon;
            				}
            			}
            			
            			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
            			var length = this_.calculateShapeDistance();
        				$.ajax(url, {
        					type: 'POST',				
        					data: JSON.stringify({
        						'routeId': routeId,
        						'from': from,
        						'to': to,
        						'mode': mode,
        						'agency': agency,
        						'shape': this_.points,
        						'username': login,
        						'length': length,
        						'arrive': arrive,
        						'departure': departure,
        						'service': service,
        						'frequency': frequency,
        						'startTime': startTime,
        						'endTime': endTime,
        						'headway': headway,
        						'arriveDays': arriveDays,
        						'singleDate': this_.isSingleDate,
        						'gtfs': gtfs,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",

        					beforeSend: function(){
        						if(service == null){
        							otp.widgets.Dialogs.showOkDialog("Please select Service", "Error");
        							return false;
        						}
        						
        						//check if the arrive/departure time is well-formed
        						if(arrive == '' || departure == ''){
        							otp.widgets.Dialogs.showOkDialog("Please enter arrival/departure time.", "Error");
        							return false;
        						}
        						var StringSplitor = arrive.split(":");
        						if(StringSplitor.length != 3){
        							otp.widgets.Dialogs.showOkDialog("Arrival time is invalid.", "Error");
        							return false;
        						}
        						if(!Number.isInteger(parseInt(StringSplitor[0])) || !Number.isInteger(parseInt(StringSplitor[1])) || !Number.isInteger(parseInt(StringSplitor[2]))){
        							otp.widgets.Dialogs.showOkDialog("Arrival time is invalid.", "Error");
        							return false;
        						}
        						var StringSplitor = departure.split(":");
        						if(StringSplitor.length != 3){
        							otp.widgets.Dialogs.showOkDialog("Departure time is invalid.", "Error");
        							return false;
        						}
        						if(!Number.isInteger(parseInt(StringSplitor[0])) || !Number.isInteger(parseInt(StringSplitor[1])) || !Number.isInteger(parseInt(StringSplitor[2]))){
        							otp.widgets.Dialogs.showOkDialog("Departure time is invalid.", "Error");
        							return false;
        						}
        						if(parseInt(StringSplitor[0]) >= 24){
        							otp.widgets.Dialogs.showOkDialog("Departure time should be less than 24:00:00.", "Error");
        							return false;
        						}
        						
        						if(this_.isSingleDate){
        							var date1 = new Date($('#' + this_.id + '-departureDate').val()).getTime();
        							var date2 = new Date(arriveDate).getTime();
        							if(date1 > date2){
        								otp.widgets.Dialogs.showOkDialog("Departure date > Arrival date", "Error");
        								return false;
        							}
        						}
        						else{
        							if(!Number.isInteger(parseInt(arriveDays))){
        								otp.widgets.Dialogs.showOkDialog("Arrival days is invalid.", "Error");
        								return false;
        							}
        						}
        						
        						//check input data if the frequency is selected
        						if(frequency){
        							if(startTime == '' || endTime == '' || headway == ''){
        								otp.widgets.Dialogs.showOkDialog("Please enter start/end time and headway.", "Error");
        								return false;
        							}
        							
        							//check if the start/end time/headway is well-formed
        							if(!Number.isInteger(parseInt(headway))){
        								otp.widgets.Dialogs.showOkDialog("Frequency headway is invalid.", "Error");
        								return false;
        							}						
        							var StringSplitor = startTime.split(":");
        							if(StringSplitor.length != 3){
        								otp.widgets.Dialogs.showOkDialog("Frequency start time is invalid.", "Error");
        								return false;
        							}
        							if(!Number.isInteger(parseInt(StringSplitor[0])) || !Number.isInteger(parseInt(StringSplitor[1])) || !Number.isInteger(parseInt(StringSplitor[2]))){
        								otp.widgets.Dialogs.showOkDialog("Frequency start time is invalid.", "Error");
        								return false;
        							}
        							var StringSplitor = endTime.split(":");
        							if(StringSplitor.length != 3){
        								otp.widgets.Dialogs.showOkDialog("Frequency end time is invalid.", "Error");
        								return false;
        							}
        							if(!Number.isInteger(parseInt(StringSplitor[0])) || !Number.isInteger(parseInt(StringSplitor[1])) || !Number.isInteger(parseInt(StringSplitor[2]))){
        								otp.widgets.Dialogs.showOkDialog("Frequency end time is invalid.", "Error");
        								return false;
        							}
        						}
        					},
        					
        					success: function(val){
        						switch (val){
        							case 0:
        								otp.widgets.Dialogs.showOkDialog("Route updated", "GTFS updated");
        								
            							var index = $('#otp-gtfs-routeEditor-routeList').prop('selectedIndex') -1;
            							console.log(this_./*customizedRoutes*/routes[index]);
            							
            							this_.routes[index].agency = agency;
            							            							
            							for(var i = this_.customizedRoutes.length-1; i >= 0; i--){
            								if(this_.customizedRoutes[i].id == routeId){
            									this_.customizedRoutes[i].agency = agency;
            									break;
            								}        								
            							}
            							
        								break;
        								
        							case -1:
        								otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        								break;
        						}
        					},
        				})
        			})
            	});
            	
            	$('#' + this_.id + '-add').attr('title', 'Create a new route').click(function(){
            		this_.clearMap();
            		this_.shapeWidget.clear();
            		this_.points = [];
            		this_.startPoint = null;
            		this_.endPoint = null;
            		this_.gtfsEditor.close();
            		
            		this_.disableButton();
            		this_.cleanPanel();
            		this_.adderWidget.setStops(this_.control.stopEditor.stops);
            		this_.adderWidget.setServices(this_.control.serviceEditor.services, this_.control.serviceEditor.calendarDates);
            		this_.adderWidget.routes = this_.routes;
            		this_.adderWidget.show();
            		if(this_.adderWidget.isMinimized) this_.adderWidget.unminimize();
                    this_.adderWidget.bringToFront();
                    
                    this_.shapeWidget.show();
            		if(this_.shapeWidget.isMinimized) this_.shapeWidget.unminimize();
                    this_.shapeWidget.bringToFront();
            	});
            }
        })
	},
	
	sortRoutes: function(){
    	this.routes.sort(function(data1, data2){
    		if(data1.shortName > data2.shortName)
    			return 1;
    		else 
    			return -1;
    	});
	},
	
	cleanPanel: function(){
		$('#otp-gtfs-routeEditor-routeList option').eq(0).prop('selected', true);
		$('#' + this.id + '-name').val('');
		$('#' + this.id + '-from').val('');
		$('#' + this.id + '-to').val('');
		$('#' + this.id + '-mode').val('');
		$('#' + this.id + '-agency').val('');
		$('#otp-gtfs-routeEditor-service option').eq(0).prop('selected', true);
		
		if($('#' + this.id + '-frequencyCheckbox').prop("checked"))
			$('#' + this.id + '-frequencyCheckbox').click();
		
		$('#' + this.id + '-startTime').val('');
		$('#' + this.id + '-endTime').val('');
		$('#' + this.id + '-headway').val('');
		
		$('#' + this.id + '-departure').val('');
		$('#' + this.id + '-arriveDays').val('');
		$('#' + this.id + '-arrive').val('');
		$('#' + this.id + '-arriveTime').val('');
		$('#' + this.id + '-departureTime').val('');
		$('#' + this.id + '-arriveDate').datepicker("setDate", new Date());
	},
	
	disableButton: function(){
		$('#' + this.id + '-save').addClass('disableButton');
		$('#' + this.id + '-save').prop('disabled', true);
		$('#' + this.id + '-remove').addClass('disableButton');
		$('#' + this.id + '-remove').prop('disabled', true);
	},
	
	enableButton: function(){
		$('#' + this.id + '-save').removeClass('disableButton');
		$('#' + this.id + '-save').removeProp('disabled');
		$('#' + this.id + '-remove').removeClass('disableButton');
		$('#' + this.id + '-remove').removeProp('disabled');
	},
	
    addShape: function(event, widget){
		if(widget == this.adderWidget){
			console.log("add shape addwidget");
	    	if(this.startPoint && this.endPoint){
	    		console.log("add shape addwidget new point");
	    		this.newPoint = event.latlng;
				this.addLine(false);
	    	}
		}
		else if(widget == this.shapeWidget){
	    	this.newPoint = event.latlng;
			this.addLine(false);
		}
    },
    
    addLine: function(startEndChange){
    	if(this.startPoint && this.endPoint){
    		if(this.points.length == 0){
    			this.points.push(this.startPoint);
    			this.points.push(this.endPoint);
    		}
    		else{
    			this.points[0] = this.startPoint;
    			this.points[this.points.length-1] = this.endPoint;
    			//check if the function is called by adding new point or change start/end point
    			if(!startEndChange)
    				this.points.splice(this.points.length-1, 0, this.newPoint);
    		}    		
    		this.drawRoute();
    	}
    },
	
	drawRoute: function(){
		var this_ = this;
		
		this.clearMap();
		console.log(this.points);
		this.polyline = new L.Polyline(this.points);
		this.gtfsEditor.owner.pathLayer.addLayer(this.polyline);
		
		for(var i=0; i < this.points.length; i++){
			if(i == 0)
				var marker = new L.Marker(this.points[i], {icon: this.gtfsEditor.owner.icons.startFlag, draggable: false});
			else if(i == this.points.length-1)
				var marker = new L.Marker(this.points[i], {icon: this.gtfsEditor.owner.icons.endFlag, draggable: false});
			else
				var marker = new L.Marker(this.points[i], {icon: this.gtfsEditor.owner.icons.large0, draggable: true});
			this.gtfsEditor.owner.markerLayer.addLayer(marker);
			this.markers.push(marker);
		}
		this.shapeWidget.cleanTable();
		this.shapeWidget.setPointList(this.points);
		
		for(var i=1; i < this.markers.length-1; i++){
			this.markers[i].on('dragend', function(event){
				this_.resetRoute();
				this_.shapeWidget.updatePointList(this_.points);
			})
		}
	},
	
	resetRoute: function(){		
		this.gtfsEditor.owner.pathLayer.removeLayer(this.polyline);
		this.points = [];
		for(var j=0; j < this.markers.length; j++){
			this.points.push(this.markers[j]._latlng);
		}
		this.startPoint = this.points[0];
		this.endPoint = this.points[this.points.length-1];
		this.polyline.setLatLngs(this.points);
		this.gtfsEditor.owner.pathLayer.addLayer(this.polyline);
	},
	
	reorderRoute: function(before, after){
		var tmp = this.markers[before];
		if(before < after){
			this.markers.splice(after+1, 0, tmp);
			this.markers.splice(before, 1);
		}
		else{
			this.markers.splice(before, 1);
			this.markers.splice(after, 0, tmp);
		}
		this.resetRoute();
		this.shapeWidget.updateTableIndex();
	},	
	
	//called when a new route is added
	setRoute: function(route){
		var content = {
			'longName': route.from + ' - ' + route.to,
			'mode': route.mode,
			'agencyName': route.agency,
			'shortName': route.from + '_' + route.to,
			'desc': route.desc,
			'id': route.id,
		}
		console.log(content);
		this.routes.push(content);
		this.customizedRoutes.push(content);
		this.adderWidget.routes = this.routes;
		$('<option>' + (content.id.split(":")[1]) + '</option>').appendTo($('#otp-gtfs-routeEditor-routeList'));
	},
	
	setServices: function(services){
		console.log(services);
		$('#' + this.id + '-service').empty();
    	$('<option selected disabled>Select Services</option>').appendTo($('#' + this.id + '-service'));
    	for(var i=0; i < services.length; i++){
    		$('<option>' + services[i].serviceId + '</option>').appendTo($('#' + this.id + '-service'));
    	}
    },
	
	calculateShapeDistance: function(){
		var this_ = this;
		var distance = [];
		
		distance[0] = 0;
		for(var i=1; i < this.points.length; i++){
			var latlng = new L.LatLng(this.points[i].lat, this.points[i].lng);
			var prevLatlng = new L.LatLng(this.points[i-1].lat, this.points[i-1].lng);
			var length = latlng.distanceTo(prevLatlng);
			distance[i] = distance[i-1] + length;
		}		
		console.log(distance);
		return distance;
	},
	
	deleteRoutesForStop: function(stop){
		console.log(stop);
		console.log(this.routes);
		for(var i = this.routes.length-1; i >= 0; i--){
			var fields = this.routes[i].id.split(":")[1].split("_");
			if(fields[0] == stop.toUpperCase() || fields[1] == stop.toUpperCase()){
				this.routes.splice(i, 1);
				$('#otp-gtfs-routeEditor-routeList option')[i+1].remove();
			}
		}
		console.log(this.routes);
	},
	
	deleteRoutesForService: function(routeIds){
		console.log(routeIds);
		console.log(this.routes);
		for(var i = this.routes.length-1; i >= 0; i--){
			for(var j=0; j < routeIds.length; j++){
				if(this.routes[i].id.split(":")[1] == routeIds[j]){
					this.routes.splice(i, 1);
					$('#otp-gtfs-routeEditor-routeList option')[i+1].remove();
					break;
				}
			}
		}
		console.log(this.routes);
	},
	
	resetRoutes: function(data){
		$('#otp-gtfs-routeEditor-routeList option :gt(0)').remove();
		this.routes = data;
		
		this.customizedRoutes = [];
		for(var i=0; i < this.routes.length; i++){
    		if(this.routes[i].desc.split(';')[0].split(':')[1] == 'custom')
    			this.customizedRoutes.push(this.routes[i]);
    	}
    	
    	for(var i=0; i < this.routes.length; i++){
    		$('<option>' + (this.routes[i].id.split(':')[1]) + '</option>').appendTo($('#otp-gtfs-routeEditor-routeList'));
    	}
	},
	
	restore: function(){
		console.log("restore route eidtor");
		$('#' + this.id + '-info').addClass('hideInfo');
		this.gtfsEditor.show();
	},
	
	clearMap: function(){
		console.log('clear map');
		if(this.gtfsEditor.owner.pathLayer.hasLayer(this.polyline))
			this.gtfsEditor.owner.pathLayer.removeLayer(this.polyline);
		if(this.polyline != null)
			this.polyline == null;
		for(var i=0; i < this.markers.length; i++)
			if(this.gtfsEditor.owner.markerLayer.hasLayer(this.markers[i]))
				this.gtfsEditor.owner.markerLayer.removeLayer(this.markers[i]);
		this.markers = [];
	},
	
	clear: function(){
		console.log("clear route editor");
		this.adderWidget.clear();
		this.shapeWidget.clear();
		this.clearMap();
		this.cleanPanel();
	},
})


otp.widgets.gtfsEditor.serviceEditor = 
	otp.Class(otp.widgets.gtfsEditor.gtfsEditorWidgetControl, {
	
	id : null,
	gtfsEditor: null,
	control: null,
	
	adderWidget: null,
	
	services: [],
	calendarDates: [],
	startdate: null,
	enddate: null,
	
	index: null,
	counter: [],

	initialize : function(gtfsEditor, control) {
    	var this_ = this;
    	this.gtfsEditor = gtfsEditor;
    	this.control = control;
    	otp.widgets.gtfsEditor.gtfsEditorWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = gtfsEditor.id+"-serviceEditor";
        
	    ich['otp-gtfsEditor-serviceEditor']({
	    	id: _tr("ID"),
	    	mon: _tr("Mon"),
	    	tue: _tr("Tue"),
	    	wed: _tr("Wed"),
	    	thu: _tr("Thu"),
	    	fri: _tr("Fri"),
	    	sat: _tr("Sat"),
	    	sun: _tr("Sun"),
	    	start: _tr("Start Date"),
	    	end: _tr("End Date"),
	    	save: _tr("save"),
	    	remove: _tr("remove"),
            widgetID: this.id
	    }).appendTo(this.$());
	    
	    this.adderWidget = new otp.widgets.ServiceAdderWidget(this.id + '-adderWidget', this, _tr('Service Adder'));
	},
	
	doAfterLayout : function(){
		var this_ = this;
        
		$('#' + this.id + '-info').addClass('hideInfo');

		$('#'+this.id+'-startdate').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
            	this_.startdate = date;
            }
        });
		$('#'+this.id+'-enddate').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
            	this_.enddate = date;
            }
        });
		$('#' + this.id + '-serviceId').prop('disabled', true);
		
		//change of checkbox may affect exceptions
        var checkboxes = $('#otp-gtfs-serviceEditor-table input[type="checkbox"]');
        for(var i=0; i < checkboxes.length; i++){
        	$(checkboxes[i]).data('index', i).change(function(){
        		var thisCheckbox = this;       		
        		var index = $(this).data('index');
        		console.log(index + ' : ' + $(this).prop('checked'));
        		
        		if(this_.counter[index] != 0){
        			otp.widgets.Dialogs.showYesNoDialog('' + this_.counter[index] + ' of the exceptions will be deleted! Continue?', 'Warning', function(){
        				//Yes, then delete the corresponding exceptions
        				var tempInclude = $('#otp-gtfs-serviceEditor-includedDates div');
        				console.log(tempInclude.length);
        				for(var j=0; j < tempInclude.length; j++){
        					var date = $(tempInclude[j]).children('input[type="text"]').val();
        					console.log(date);
        					if(date != ''){
	        					var data = date.split('/');
	        			    	var temp = new Date();
	        			    	temp.setFullYear(data[2], data[0]-1, data[1]);
	        			    	var day = temp.getDay();
	        			    	
	        					if(day == index){
	        						$(tempInclude[j]).remove();
	        						this_.counter[day]--;
	        						console.log(this_.counter);
	        					}
        					}
        				}
        				
        				var tempExclude = $('#otp-gtfs-serviceEditor-excludedDates div');
        				console.log(tempExclude.length);
        				for(var j=0; j < tempExclude.length; j++){
        					var date = $(tempExclude[j]).children('input[type="text"]').val();
        					console.log(date);
        					if(date != ''){
	        					var data = date.split('/');
	        			    	var temp = new Date();
	        			    	temp.setFullYear(data[2], data[0]-1, data[1]);
	        			    	var day = temp.getDay();
	        			    	
	        					if(day == index){
	        						$(tempExclude[j]).remove();
	        						this_.counter[day]--;
	        						console.log(this_.counter);
	        					}
        					}
        				}
        			}, function(){
        				//No, then rollback
        				console.log(thisCheckbox);
        				if($(thisCheckbox).prop('checked'))
        					$(thisCheckbox).removeProp('checked');
        				else
        					$(thisCheckbox).prop('checked', true);
        			});
        		}
        	})
        }
        
        //add exceptions
		$('#'+this.id+'-includedDatesAdder').click(function(){
			$('<div style="margin:1px; display: inline;"><input id="' + this_.id + '-date' + this_.index + '" type="text" style="width: 80px; text-align: center"/><input type="button" id="' + this_.id + '-includedDatesDelete' + this_.index +'" value="X"/></div>').insertBefore($(this));
			$('#' + this_.id + '-date' + this_.index).datepicker({
	            timeFormat: otp.config.locale.time.time_format_picker,
	            onSelect: function(date) {
	            	console.log(date);
	            	var valid = this_.checkExceptionDate(date, '/', 'include', this);
	            	console.log(valid);
	            	if(!valid)
	            		$(this).val('');
	            }
	        });
			$('#' + this_.id + '-includedDatesDelete' + this_.index).click(function(){
				var date = $($(this).siblings()[0]).val();
		    	var data = date.split('/');
		    	var temp = new Date();
		    	temp.setFullYear(data[2], data[0]-1, data[1]);
		    	var day = temp.getDay();		    	
		    	this_.counter[day]--;
		    	
				$(this).parent().remove();
			});
			this_.index++;
		});
		$('#'+this.id+'-excludedDatesAdder').click(function(){
			$('<div style="margin:1px; display: inline;"><input id="' + this_.id + '-date' + this_.index + '" type="text" style="width: 80px; text-align: center"/><input type="button" id="' + this_.id + '-excludedDatesDelete' + this_.index +'" value="X"/></div>').insertBefore($(this));
			$('#' + this_.id + '-date' + this_.index).datepicker({
	            timeFormat: otp.config.locale.time.time_format_picker,
	            onSelect: function(date) {
	            	console.log(date);
	            	var valid = this_.checkExceptionDate(date, '/', 'exclude', this);
	            	console.log(valid);
	            	if(!valid)
	            		$(this).val('');
	            }
	        });
			$('#' + this_.id + '-excludedDatesDelete' + this_.index).click(function(){
				var date = $($(this).siblings()[0]).val();
		    	var data = date.split('/');
		    	var temp = new Date();
		    	temp.setFullYear(data[2], data[0]-1, data[1]);
		    	var day = temp.getDay();		    	
		    	this_.counter[day]--;
		    	
				$(this).parent().remove();
			});
			this_.index++;
		});
		
		$('<option selected disabled>Select service</option>').appendTo($('#otp-gtfs-serviceEditor-serviceList'));
		var url = otp.config.hostname + '/' + otp.config.restService + '/index/services';
		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
		if(loginStatus != "-1"){
			url = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/services';
		}
		$.ajax(url,{
            success: function(data) {
            	console.log(data);
            	this_.services = data;
            	
            	//get fixed-date service
            	var url2 = otp.config.hostname + '/' + otp.config.restService + '/index/calendarDates';
        		var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        		if(loginStatus != "-1"){
        			url2 = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/calendarDates/';
        		}
        		$.ajax(url2,{
        			success: function(data2) {
        				this_.calendarDates = data2;
//        				console.log(data);
//        				console.log(data2);      				
        				var serviceIds = data.map(n=>n.serviceId);
//        				console.log(serviceIds);
        				
        				//check fixed-date calendars
        				for(var i=0; i < data2.length; i++){
        					if(serviceIds.includes(data2[i].serviceId))
        						continue;
        					else{
        						console.log('not include')
        						this_.services.push(data2[i]);
        						serviceIds.push(data2[i].serviceId);
        					}
        				}
        				
                    	this_.sortServices();
        				
                    	for(var i=0; i < this_.services.length; i++){
                    		$('<option>' + this_.services[i].serviceId + '</option>').appendTo($('#otp-gtfs-serviceEditor-serviceList'));
                    	}
                    	
                    	this_.control.routeEditor.setServices(this_.services);
        			}
        		});
            	
            	$('#otp-gtfs-serviceEditor-serviceList').change(function(){
            		$('#' + this_.id + '-info').removeClass('hideInfo');

            		$('#otp-gtfs-serviceEditor-table input[type="checkbox"]').each(function(){
            			$(this).removeProp("checked");
            		})
            		$('#'+this_.id+'-startdate').datepicker('setDate', new Date());
            		$('#'+this_.id+'-enddate').datepicker('setDate', new Date());

                    $('#otp-gtfs-serviceEditor-includedDates div').each(function(){$(this).remove()});
                    $('#otp-gtfs-serviceEditor-excludedDates div').each(function(){$(this).remove()});
            		this_.index = 0;
                    for(var i=0; i<7; i++)
                    	this_.counter[i] = 0;
            		
//            		console.log(this_.services);
            		var index = this.selectedIndex -1;
            		var content = this_.services[index];
//            		console.log(content);
            		$('#' + this_.id + '-serviceId').val(content.serviceId);
            		
            		//check if the service is periodic-based
            		if('monday' in content){
	            		content.monday == 1 ? $('#' + this_.id + '-mon-checkbox').prop('checked', true) : $('#' + this_.id + '-mon-checkbox').removeProp('checked');
	            		content.tuesday == 1 ? $('#' + this_.id + '-tue-checkbox').prop('checked', true) : $('#' + this_.id + '-tue-checkbox').removeProp('checked') ;
	            		content.wednesday == 1 ? $('#' + this_.id + '-wed-checkbox').prop('checked', true) : $('#' + this_.id + '-wed-checkbox').removeProp('checked') ;
	            		content.thursday == 1 ? $('#' + this_.id + '-thu-checkbox').prop('checked', true) : $('#' + this_.id + '-thu-checkbox').removeProp('checked') ;
	            		content.friday == 1 ? $('#' + this_.id + '-fri-checkbox').prop('checked', true) : $('#' + this_.id + '-fri-checkbox').removeProp('checked') ;
	            		content.saturday == 1 ? $('#' + this_.id + '-sat-checkbox').prop('checked', true) : $('#' + this_.id + '-sat-checkbox').removeProp('checked') ;
	            		content.sunday == 1 ? $('#' + this_.id + '-sun-checkbox').prop('checked', true) : $('#' + this_.id + '-sun-checkbox').removeProp('checked');
	            		var date = content.startDate.month + '/' + content.startDate.day + '/' + content.startDate.year;
	            		$('#'+this_.id+'-startdate').datepicker('setDate', date);
	            		this_.startdate = date;
	            		var date = content.endDate.month + '/' + content.endDate.day + '/' + content.endDate.year;
	            		$('#'+this_.id+'-enddate').datepicker('setDate', date);
	            		this_.enddate = date;
            		}
            		
//            		console.log(this_.calendarDates);
            		for(var i=0; i < this_.calendarDates.length; i++){
            			if(this_.calendarDates[i].serviceId == content.serviceId){
            				//set exceptions counter
            		    	var temp = new Date();
            		    	temp.setFullYear(this_.calendarDates[i].date.year, this_.calendarDates[i].date.month-1, this_.calendarDates[i].date.day);
            		    	var day = temp.getDay();
            		    	this_.counter[day]++;
            				
            				if(this_.calendarDates[i].exceptionType == 1){
            					var dateDiv = $('<div style="margin:1px; display: inline;"><input id="' + this_.id + '-date' + this_.index + '" type="text" style="width: 80px; text-align: center"/><input type="button" id="' + this_.id + '-includedDatesDelete' + this_.index +'" value="X"/></div>');
            					dateDiv.insertBefore($('#'+this_.id+'-includedDatesAdder'));
            					$('#' + this_.id + '-date' + this_.index).datepicker({
                    	            timeFormat: otp.config.locale.time.time_format_picker,
                    	            onSelect: function(date) {
                    	            	console.log(date);
                    	            	var valid = this_.checkExceptionDate(date, '/', 'include', this);
                    	            	console.log(valid);
                    	            	if(!valid)
                    	            		$(this).val('');
                    	            }
                    	        });
                    			var date = this_.calendarDates[i].date.month + '/' + this_.calendarDates[i].date.day + '/' + this_.calendarDates[i].date.year;
                    			$('#' + this_.id + '-date' + this_.index).datepicker('setDate', date);
                    			
                    			$('#' + this_.id + '-includedDatesDelete' + this_.index).click(function(){
                    				var date = $($(this).siblings()[0]).val();
                    		    	var data = date.split('/');
                    		    	var temp = new Date();
                    		    	temp.setFullYear(data[2], data[0]-1, data[1]);
                    		    	var day = temp.getDay();		    	
                    		    	this_.counter[day]--;
                    		    	
                    				$(this).parent().remove();
                    			});
            				}
            				else{
            					var dateDiv = $('<div style="margin:1px; display: inline;"><input id="' + this_.id + '-date' + this_.index + '" type="text" style="width: 80px; text-align: center"/><input type="button" id="' + this_.id + '-excludedDatesDelete' + this_.index +'" value="X"/></div>');
            					dateDiv.insertBefore($('#'+this_.id+'-excludedDatesAdder'));
            					$('#' + this_.id + '-date' + this_.index).datepicker({
                    	            timeFormat: otp.config.locale.time.time_format_picker,
                    	            onSelect: function(date) {
                    	            	console.log(date);
                    	            	var valid = this_.checkExceptionDate(date, '/', 'exclude', this);
                    	            	console.log(valid);
                    	            	if(!valid)
                    	            		$(this).val('');
                    	            }
                    	        });
                    			var date = this_.calendarDates[i].date.month + '/' + this_.calendarDates[i].date.day + '/' + this_.calendarDates[i].date.year;
                    			$('#' + this_.id + '-date' + this_.index).datepicker('setDate', date);
                    			
                    			$('#' + this_.id + '-excludedDatesDelete' + this_.index).click(function(){
                    				var date = $($(this).siblings()[0]).val();
                    		    	var data = date.split('/');
                    		    	var temp = new Date();
                    		    	temp.setFullYear(data[2], data[0]-1, data[1]);
                    		    	var day = temp.getDay();		    	
                    		    	this_.counter[day]--;
                    		    	
                    				$(this).parent().remove();
                    			});
            				}                			
                			
            				this_.index++;
            			}
            		}
            		console.log(this_.counter);
            	});
            	
            	$('#' + this_.id + '-save').click(function(){
            		otp.widgets.Dialogs.showYesNoDialog("Save your editing?", "Update", function(){
            			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/service/edit';
            			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/service/edit';
        				}
            			var id = $('#'+this_.id+'-serviceId').val();
            			var mon; $('#'+this_.id+'-mon-checkbox').prop('checked') ? mon = 1: mon = 0;
            			var tue; $('#'+this_.id+'-tue-checkbox').prop('checked') ? tue = 1: tue = 0;
            			var wed; $('#'+this_.id+'-wed-checkbox').prop('checked') ? wed = 1: wed = 0;
            			var thu; $('#'+this_.id+'-thu-checkbox').prop('checked') ? thu = 1: thu = 0;
            			var fri; $('#'+this_.id+'-fri-checkbox').prop('checked') ? fri = 1: fri = 0;
            			var sat; $('#'+this_.id+'-sat-checkbox').prop('checked') ? sat = 1: sat = 0;
            			var sun; $('#'+this_.id+'-sun-checkbox').prop('checked') ? sun = 1: sun = 0;		
            			var start = (this_.startdate != null) ? this_.startdate : moment().format(otp.config.locale.time.date_format);
            			var end = (this_.enddate != null) ? this_.enddate : moment().format(otp.config.locale.time.date_format);
//            			console.log(start);
            			//add data related to the exceptions
            			var include = [], exclude = [];	
            			var tempInclude = $('#otp-gtfs-serviceEditor-includedDates div');
            			for(var j=0; j < tempInclude.length; j++){
            				var date = $(tempInclude[j]).children('input[type="text"]').val();
            				include.push(date);
            			}
            			var tempExclude = $('#otp-gtfs-serviceEditor-excludedDates div');
//            			console.log(tempExclude.length);
            			for(var j=0; j < tempExclude.length; j++){
            				var date = $(tempExclude[j]).children('input[type="text"]').val();
            				exclude.push(date);
            			}
//            			console.log(include);
            			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
        				$.ajax(url, {
        					type: 'POST',				
        					data: JSON.stringify({
        						'id': id,
        						'mon': mon,
        						'tue': tue,
        						'wed': wed,
        						'thu': thu,
        						'fri': fri,
        						'sat': sat,
        						'sun': sun,
        						'startdate': start,
        						'enddate': end,
        						'username': login,
        						'include': include,
        						'exclude': exclude,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",
        					
        					beforeSend: function(){
        						var hasPeriodic = false;
        						var checkboxes = $('#otp-gtfs-serviceEditor-table input[type="checkbox"]');
        						for(var i=0; i < checkboxes.length; i++){
        				        	if($(checkboxes[i]).prop("checked")){
        				        		hasPeriodic = true;
        				        		break;
        				        	}			        	
        						}
//        						console.log(hasPeriodic);
        						if(hasPeriodic){
        							//check if end<start
        							var date1 = new Date(start).getTime();
        							var date2 = new Date(end).getTime();
        							if(date1 > date2){
        								otp.widgets.Dialogs.showOkDialog("Start date > End date", "Error");
        								return false;
        							}
        						}
        						else{
//        							console.log(include);
        							if(include.length == 0){
        								otp.widgets.Dialogs.showOkDialog("Please enter calendar data", "Error");
        								return false;
        							}
        						}
        					},
        					
        					success: function(val){
        						switch (val){
        							case 0:
        								otp.widgets.Dialogs.showOkDialog("Service updated", "GTFS updated"); 
        								
            							var index = $('#otp-gtfs-serviceEditor-serviceList').prop('selectedIndex') -1;
//            							console.log(this_.services[index]);
            							
            							mon == 1 ? this_.services[index].monday = 1 : this_.services[index].monday = 0;
            							tue == 1 ? this_.services[index].tuesday = 1 : this_.services[index].tuesday = 0;
            							wed == 1 ? this_.services[index].wednesday = 1 : this_.services[index].wednesday = 0;
            							thu == 1 ? this_.services[index].thursday = 1 : this_.services[index].thursday = 0;
            							fri == 1 ? this_.services[index].friday = 1 : this_.services[index].friday = 0;
            							sat == 1 ? this_.services[index].saturday = 1 : this_.services[index].saturday = 0;
            							sun == 1 ? this_.services[index].sunday = 1 : this_.services[index].sunday = 0;
            							this_.services[index].startDate.month = start.split('/')[0];
            							this_.services[index].startDate.day = start.split('/')[1];
            							this_.services[index].startDate.year = start.split('/')[2];
            							this_.services[index].endDate.month = end.split('/')[0];
            							this_.services[index].endDate.day = end.split('/')[1];
            							this_.services[index].endDate.year = end.split('/')[2];
            							
            							for(var i = this_.calendarDates.length-1; i >= 0; i--){
            								if(this_.calendarDates[i].serviceId == id){
            									this_.calendarDates.splice(i, 1);
            								}
            							}
            							for(var i=0; i < include.length; i++){
            								var temp = include[i].split('/');
            								var newDate = {
            									'serviceId': id,
            									'date': {
            										'year': temp[2],
            										'month': temp[0],
            										'day': temp[1],
            									},
            									'exceptionType': '1',
            								}
            								this_.calendarDates.push(newDate);
            							}
            							for(var i=0; i < exclude.length; i++){
            								var temp = exclude[i].split('/');
            								var newDate = {
            									'serviceId': id,
            									'date': {
            										'year': temp[2],
            										'month': temp[0],
            										'day': temp[1],
            									},
            									'exceptionType': '2',
            								}
            								this_.calendarDates.push(newDate);
            							}
            							
        								break;
        								
        							case -1:
        								otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        								break;
        						}
        					},
        				})
        			})
            	});
            	
            	$('#' + this_.id + '-remove').click(function(){
            		otp.widgets.Dialogs.showYesNoDialog("You will also lose all the routes based on this service. Continue?", "Delete service", function(){
        				var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/service/remove';
        				var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
        				if(loginStatus != "-1"){
        					url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/service/remove';
        				}
        				var id = $('#'+this_.id+'-serviceId').val();
        				var login = this_.control.gtfsEditor.owner.checkLoginStatus();
        				$.ajax(url, {
        					type: 'POST',
        					data: JSON.stringify({
        						'id': id,
        						'username': login,
        					}),
        					dataType: 'JSON',
        					contentType: "application/json",
    					
        					success: function(val){
        						if(val[0] != "-1"){
        							otp.widgets.Dialogs.showOkDialog("Service deleted", "GTFS updated");
        							
        							var index = $('#otp-gtfs-serviceEditor-serviceList').prop('selectedIndex') -1;   
        							console.log(this_.services[index]);
        							$('#otp-gtfs-serviceEditor-serviceList option').each(function(){
        								if($(this).val() == this_.services[index].serviceId){
        									console.log($(this).val());
        									$(this).remove();
        								}
        							});      							
        							this_.services.splice(index, 1);
        							console.log(this_.services);
        							
        							this_.cleanPanel();
        							this_.control.routeEditor.setServices(this_.services);
        							
        							//the routes under the deleted service need to be updated
        							this_.control.routeEditor.deleteRoutesForService(val);
        						}
        						else{
        							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
        						}
        					},
        				})
        			})
            	});
            	
            	$('#' + this_.id + '-add').attr('title', 'Create a new service').click(function(){
            		this_.gtfsEditor.close();
            		this_.cleanPanel();
            		
            		this_.adderWidget.services = this_.services;
            		this_.adderWidget.show();
            		if(this_.adderWidget.isMinimized) this_.adderWidget.unminimize();
                    this_.adderWidget.bringToFront();
            	});
            },
		});
	},
	
	sortServices: function(){
    	this.services.sort(function(data1, data2){
    		if(data1.serviceId > data2.serviceId)
    			return 1;
    		else 
    			return -1;
    	});
	},
	
	cleanPanel: function(){
		$('#otp-gtfs-serviceEditor-serviceList option').eq(0).prop('selected', true);
		$('#' + this.id + '-serviceId').val('');
		
		$('#otp-gtfs-serviceEditor-table input[type="checkbox"]').each(function(){
			$(this).removeProp("checked");
		})
		$('#'+this.id+'-startdate').datepicker('setDate', new Date());
		$('#'+this.id+'-enddate').datepicker('setDate', new Date());

        $('#otp-gtfs-serviceEditor-includedDates div').each(function(){$(this).remove()});
        $('#otp-gtfs-serviceEditor-excludedDates div').each(function(){$(this).remove()});	
	},
	
	setService: function(service){
		if(service.mon==1 || service.tue==1 || service.wed==1 || service.thu==1 || service.fri==1 || service.sat==1 || service.sun==1){
			var content = {
				'serviceId': service.id,
				'monday': service.mon,
				'tuesday': service.tue,
				'wednesday': service.wed,
				'thursday': service.thu,
				'friday': service.fri,
				'saturday': service.sat,
				'sunday': service.sun,
				'startDate': {
					'month': service.startdate.split('/')[0],
					'day': service.startdate.split('/')[1],
					'year': service.startdate.split('/')[2],
				},
				'endDate': {
					'month': service.enddate.split('/')[0],
					'day': service.enddate.split('/')[1],
					'year': service.enddate.split('/')[2],
				},
			}
		}
		else{
			console.log(service.include);
			console.log(service.exclude);
			if(service.include.length != 0){
				var temp = service.include[0].split('/');
				var content = {
					'serviceId': service.id,
					'date': {
						'year': temp[2],
						'month': temp[0],
						'day': temp[1],
					},
					'exceptionType': '1',
				}
			}
		}
		console.log(content);
		this.services.push(content);
		this.adderWidget.services = this.services;
		$('<option>' + content.serviceId + '</option>').appendTo($('#otp-gtfs-serviceEditor-serviceList'));
		this.control.routeEditor.setServices(this.services);
		
		//update calendarDates;
		for(var i=0; i < service.include.length; i++){
			var temp = service.include[i].split('/');
			var content = {
				'serviceId': service.id,
				'date': {
					'year': temp[2],
					'month': temp[0],
					'day': temp[1],
				},
				'exceptionType': '1',
			}
			this.calendarDates.push(content);
		}
		for(var i=0; i < service.exclude.length; i++){
			var temp = service.exclude[i].split('/');
			var content = {
				'serviceId': service.id,
				'date': {
					'year': temp[2],
					'month': temp[0],
					'day': temp[1],
				},
				'exceptionType': '2',
			}
			this.calendarDates.push(content);
		}
		console.log(this.services);
		console.log(this.calendarDates);
	},
	
	 checkExceptionDate: function(date, separator, type, element){
		var data = date.split(separator);
    	var temp = new Date();
    	temp.setFullYear(data[2], data[0]-1, data[1]);
    	var day = temp.getDay();
    	console.log(day);
    	
    	//check if the exception date is already included/excluded from weekly periodic calendar 
    	if($($('#otp-gtfs-serviceEditor-table input[type="checkbox"]')[day]).prop('checked') && type=='include'){
    		otp.widgets.Dialogs.showOkDialog("The date is already included", "Error");
    		return false;
    	}
    	else if(!$($('#otp-gtfs-serviceEditor-table input[type="checkbox"]')[day]).prop('checked') && type=='exclude'){
    		otp.widgets.Dialogs.showOkDialog("The date is not included", "Error");
			return false;
    	}
    	
    	//avoid adding duplicated dates
    	console.log(element);
    	var previous = $(element).parent().siblings();
    	console.log(previous);
    	for(var i=0; i < previous.length; i++){
    		if($($(previous[i]).children('input[type="text"]')[0]).val() == date){
    			otp.widgets.Dialogs.showOkDialog("The date exists", "Error");
    			return false;
    		}
    	}
    	
    	this.counter[day]++;
    	console.log(this.counter);
    	return true;
	},
	
	resetServices: function(data, data2){
		$('#otp-gtfs-serviceEditor-serviceList option :gt(0)').remove();
		this.services = data;
		this.calendarDates = data2;
		
		var serviceIds = data.map(n=>n.serviceId);
		console.log(serviceIds);
		//check fixed-date calendars
		for(var i=0; i < data2.length; i++){
			if(serviceIds.includes(data2[i].serviceId))
				continue;
			else{
				this.services.push(data2[i]);
				serviceIds.push(data2[i].serviceId);
			}
		}
		
    	for(var i=0; i < this.services.length; i++){
    		$('<option>' + (this.services[i].serviceId) + '</option>').appendTo($('#otp-gtfs-serviceEditor-serviceList'));
    	}
    	
    	this.control.routeEditor.setServices(this.services);
	},
	
	restore: function(){
		console.log("restore service eidtor");
		$('#' + this.id + '-info').addClass('hideInfo');
		this.gtfsEditor.show();
	},
	
	clear: function(){
		console.log("clear service editor");
		this.adderWidget.clear();
		this.cleanPanel();
	},
})

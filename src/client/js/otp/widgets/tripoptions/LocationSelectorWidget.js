//Shuai (07-04-2017) the widget to define the necessary intermediate stops

otp.namespace("otp.widgets");

otp.widgets.LocationSelectorWidget =
    otp.Class(otp.widgets.Widget, {

    routesControl : null,
    
    selectedLocationName : null,
    selectedLocationData : null,

    restoredRouteIds : null, // agencyAndId format
    
//    locations: [],
//    locationData: {},
    
    geocoder: null,
    
    isValid: false,
    
    locationSelect: null,

    initializedRoutes : false,

    initialize : function(id, routesControl, name, geocoder, hasModule) {
    	this.geocoder = geocoder;
    	
        var this_ = this;
        otp.widgets.Widget.prototype.initialize.call(this, id, (hasModule ? routesControl.tripWidget.owner : routesControl.webapp), {
            openInitially : false,
            title : name
        });

        this.hasModule = hasModule;
        this.routesControl = routesControl;
        this.indexApi = (hasModule ? this.routesControl.tripWidget.module.webapp.indexApi : this.routesControl.webapp.indexApi);

        this.selectedLocationName = [];
        this.selectedLocationData = [];

        ich['otp-tripOptions-locationsSelector']({
            widgetId : this.id,
            name : this.name,
            //TRANSLATORS: All public transport routes. Shown in
            //Preffered/Banned routes widget
            enter : _tr("Enter the Location"),
            //TRANSLATORS: save preffered/banned public transport routes
            save : _tr("Save"),
            //TRANSLATORS: Close preffered/banned public transport routes
            //widget
            close : _tr("Close")
        }).appendTo(this.$());

        this.selectedList = $('#'+this_.id+'-selectedList');
        this.locationSelect = $('#'+this_.id+'-locationSelect');

        $('#'+this.id+'-addButton').button().click(function() {
        	if(this_.isValid){
	            this_.selectRoute(this_.locationSelect.data('selected')['description'].slice(5, this_.locationSelect.data('selected')['description'].length-1));
	            this_.locationSelect.val('');
	            this_.isValid = false;
        	}
        	else{
        		otp.widgets.Dialogs.showOkDialog('Please select the location from drop down', 'Input Error');
        	}
        });

        $('#'+this.id+'-removeButton').button().click(function() {
            var agencyAndId = this_.selectedList.val();
            if(agencyAndId != null){
	            $('#'+this_.id+'-selectedList option[value="'+agencyAndId+'"]').remove();
	            this_.selectedLocationName.splice( $.inArray(agencyAndId, this_.selectedLocationName), 1 );
            }
        });

        $('#'+this.id+'-saveButton').button().click(function() {
            var param = '', displayStr = '';
            for(var i = 0; i < this_.selectedLocationName.length; i++) {            	
                displayStr += this_.selectedLocationName[i] + (i < this_.selectedLocationName.length-1 ? ', ' : '');                
//                param.push(this_.locationData[this_.selectedLocationName[i]]);
//                param.push(this_.selectedLocationData[this_.selectedLocationName[i]]);
                var locationData = this_.selectedLocationData[this_.selectedLocationName[i]];
                var locationName = locationData.description.slice(5, locationData.description.length-1)/*.substring(2)*/;
                param += locationName + ':' + locationData.lat + ',' + locationData.lng + (i < this_.selectedLocationName.length-1 ? ';' : '');
            }
            this_.hide();

            this_.routesControl.setRoutes(param, displayStr, this_.id);
        });

        $('#'+this.id+'-closeButton').button().click(function() {
            this_.close();
        });

        this.center();
    },

    selectRoute : function(LocationName) {
        if(!LocationName || _.contains(this.selectedLocationName, LocationName)) return;
        this.selectedList.append('<option value="'+LocationName+'">'+LocationName+'</option>');
        this.selectedLocationName.push(LocationName);
        this.selectedLocationData[LocationName] = this.locationSelect.data('selected');
    },

    updateRouteList : function() {
    	this.locationSelect.val('');
    	
        if(this.initializedRoutes) return;
        var this_ = this;       
        
//		$.getJSON("js/otp/widgets/tripoptions/locations.json", function(data){
//			$.each(data.locations, function(key, val){
//				this_.locations.push(val);
//				this_.locationData[val.value] = {
//					data: val
//				}
				
		        this_.restoreSelected();
		        this_.initializedRoutes = true;
//			});
//		});
    },

    restoreSelected : function() {
    	var this_ = this;
        this.clearSelected();
        
        var input = $('#' + this.id + '-locationSelect');
        
        input.autocomplete({
            delay: 500, // 500ms between requests.

            source : function(request, response){
//            	this_.geocoder.geocode(request.term, function(results) {
//                    console.log("got results "+results.length);
//                    response.call(this, _.pluck(results, 'description'));
//                    input.data("results", this_.getResultLookup(results));
//                });
            	var username = this.hasModule ? this_.routesControl.tripWidget.module.checkLoginStatus() : $('#otp-username :first-child').html();    //TODO          	
            	this_.geocoder.geocode(request.term, function(results) {
            		var tmp = _.pluck(results, 'description');
            		var res = [];
            		for(var i=0; i < tmp.length; i++){
            			if(!res.includes(tmp[i].slice(5, tmp[i].length-1)))
            				res.push(tmp[i].slice(5, tmp[i].length-1));
            		}
            		response.call(this, res);
            		input.data("results", this_.getResultLookup(results));
                }, username);
            },
            
			focus: function( event, ui ) {
				input.val( ui.item.label);
				return false;
			},
        	select: function(event, ui){
        		this_.isValid = true;
        		input.data('selected', input.data("results")[ui.item.value]);
        	}
        });
    },
    
    getResultLookup : function(results) {
        var resultLookup = {};
        for(var i=0; i<results.length; i++) {
//            resultLookup[results[i].description] = results[i];
        	resultLookup[results[i].description.slice(5, results[i].description.length-1)] = results[i];
        }
        return resultLookup;
    },

    clearSelected : function() {
        this.locationSelect.val('');
        this.selectedLocationName = [];
    },
    
    cleanAll : function() {
        this.locationSelect.val('');
        this.selectedLocationName = [];
        this.selectedList.empty();
    },
});
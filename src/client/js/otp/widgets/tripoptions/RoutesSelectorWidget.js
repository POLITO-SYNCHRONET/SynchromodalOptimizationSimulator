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

//Shuai (07-03-2018) call API to load specific routes identified by stops instead of rendering all the routes (avoid crash when the number of routes are huge)

otp.namespace("otp.widgets");

otp.widgets.RoutesSelectorWidget =
    otp.Class(otp.widgets.Widget, {

    routesControl : null,

    routeData : [],
    selectedRouteIndices : [],
    selectedRouteIds : null, // agencyAndId format

    restoredRouteIds : null, // agencyAndId format

    initializedRoutes : false,
    
    geocoder: null,
    
    fromStop: null,
    toStop: null,
    fromCord: null,
    toCord: null,
        
    //store the stops of the routes whose Id contains ship code (e.g. Piraeus_AGT) for forced route
    selectedStops: [],
    
    initialize : function(id, routesControl, name, geocoder, hasModule) {
        var this_ = this;
        this.geocoder = geocoder;
        otp.widgets.Widget.prototype.initialize.call(this, id, (hasModule ? routesControl.tripWidget.owner : routesControl.webapp), {
            openInitially : false,
            title : name
        });
        
        this.hasModule = hasModule;
        this.routesControl = routesControl;
        this.indexApi = (hasModule ? this.routesControl.tripWidget.module.webapp.indexApi : this.routesControl.webapp.indexApi);

        this.selectedRouteIds = [];
        this.selectedStops = [];

        ich['otp-tripOptions-routesSelector2']({
            widgetId : this.id,
            name : this.name,
            //TRANSLATORS: All public transport routes. Shown in
            //Preffered/Banned routes widget
            allRoutes : _tr("Available Routes"),
            selected: 'Selected Routes',
            from: 'From',
            to: 'to',
            //TRANSLATORS: save preffered/banned public transport routes
            save : _tr("Save"),
            //TRANSLATORS: Close preffered/banned public transport routes
            //widget
            close : _tr("Close")
        }).appendTo(this.$());

        this.selectedList = $('#'+this_.id+'-selectedList');
        this.routeList = $('#'+this_.id+'-routeList');
        
        var from = $('#'+this.id+'-from')
        from.autocomplete({
            delay: 500, // 500ms between requests.

            source : function(request, response){
            	var username = (hasModule ? this_.routesControl.tripWidget.module.checkLoginStatus() : $('#otp-username :first-child').html());    //TODO        	
            	this_.geocoder.geocode(request.term, function(results) {
            		var tmp = _.pluck(results, 'description');
            		var res = [];
            		for(var i=0; i < tmp.length; i++){
            			if(!res.includes(tmp[i].slice(5, tmp[i].length-1)))
            				res.push(tmp[i].slice(5, tmp[i].length-1));
            		}
            		response.call(this, res);
            		from.data("results", this_.getResultLookup(results));
                }, username);
            },
            
			focus: function( event, ui ) {
				from.val( ui.item.label);
				return false;
			},
        	select: function(event, ui){
        		from.data('selected', from.data("results")[ui.item.value]);
        		this_.fromStop = from.data("results")[ui.item.value].id.replace('_', ':');
//        		console.log(from.data("results"));
        		this_.fromCord = from.data("results")[ui.item.value].lat + "_" + from.data("results")[ui.item.value].lng;
        		this_.getRoutesFromServer();
        	}
        });

        var to = $('#'+this.id+'-to')
        to.autocomplete({
            delay: 500, // 500ms between requests.

            source : function(request, response){
            	var username = (hasModule ? this_.routesControl.tripWidget.module.checkLoginStatus() : $('#otp-username :first-child').html());    //TODO         	
            	this_.geocoder.geocode(request.term, function(results) {
            		console.log(results);
            		var tmp = _.pluck(results, 'description');
            		var res = [];
            		for(var i=0; i < tmp.length; i++){
            			if(!res.includes(tmp[i].slice(5, tmp[i].length-1)))
            				res.push(tmp[i].slice(5, tmp[i].length-1));
            		}
            		response.call(this, res);
            		to.data("results", this_.getResultLookup(results));
                }, username);
            },
            
			focus: function( event, ui ) {
				to.val( ui.item.label);
				return false;
			},
        	select: function(event, ui){
        		to.data('selected', to.data("results")[ui.item.value]);
        		this_.toStop = to.data("results")[ui.item.value].id.replace('_', ':');
//        		console.log(to.data("results"));
        		this_.toCord = to.data("results")[ui.item.value].lat + "_" + to.data("results")[ui.item.value].lng;
        		this_.getRoutesFromServer();
        	}
        });


        $('#'+this.id+'-addButton').button().click(function() {
        	console.log(this_.routesControl.id);
        	console.log(this_.id);
        	if(this_.routesControl.id == "otp-planner-optionsWidget-ForcedRoutes" || this_.id == "otp-userConfigurationWidget-selectorWidget2")
        		this_.selectRoute(this_.routeList.val() + "(" + this_.fromStop.split(":")[1] + "-" + this_.toStop.split(":")[1] + ")");
        	else
        		this_.selectRoute(this_.routeList.val());
        });

        $('#'+this.id+'-removeButton').button().click(function() {
            var agencyAndId = this_.selectedList.val();
            console.log(agencyAndId);
            console.log(this_.selectedRouteIds);
            if(agencyAndId != null){
	            $('#'+this_.id+'-selectedList option[value="'+agencyAndId+'"]').remove();
	            var i = $.inArray(agencyAndId, this_.selectedRouteIds);
	            this_.selectedRouteIds.splice(i , 1);
	            if(this_.routesControl.id == "otp-planner-optionsWidget-ForcedRoutes" || this_.id == "otp-userConfigurationWidget-selectorWidget2"){
	            	this_.selectedStops.splice(i, 1);
	            }
            }
        });

        $('#'+this.id+'-saveButton').button().click(function() {
            var paramStr = '', displayStr = '';
            for(var i = 0; i < this_.selectedRouteIds.length; i++) {
                var route;
                //format expected: agency_routename or agency__routeid, so, in our case, two underscores 
                if(this_.routesControl.id == "otp-planner-optionsWidget-ForcedRoutes" || this_.id == "otp-userConfigurationWidget-selectorWidget2"){
                	route = this_.indexApi.routes[this_.selectedRouteIds[i].split("(")[0]].routeData;
                	paramStr += route.id.replace(":", "__") + "+" + this_.selectedStops[i].fromStop.split(":")[1] + "_" + this_.selectedStops[i].fromCord + "+" 
                		+ this_.selectedStops[i].toStop.split(":")[1] + "_" + this_.selectedStops[i].toCord + (i < this_.selectedRouteIds.length-1 ? ',' : '');
                	displayStr += (route.id.split(':')[1]) + "(" + this_.selectedStops[i].fromStop.split(":")[1] + "-" + this_.selectedStops[i].toStop.split(":")[1] + ")" 
                		+ (i < this_.selectedRouteIds.length-1 ? ', ' : '');
                }
                else{
                	route = this_.indexApi.routes[this_.selectedRouteIds[i]].routeData;
                	paramStr += route.id.replace(":", "__") + (i < this_.selectedRouteIds.length-1 ? ',' : '');
//                console.log(paramStr);
                	displayStr += (route.id.split(':')[1]) + (i < this_.selectedRouteIds.length-1 ? ', ' : '');
                }
            }
            this_.hide();

            this_.routesControl.setRoutes(paramStr, displayStr, this_.id);
        });

        $('#'+this.id+'-closeButton').button().click(function() {
            this_.close();
        });

        this.center();
    },
    
    getResultLookup: function(results){
    	 var resultLookup = {};
         for(var i=0; i<results.length; i++) {
         	resultLookup[results[i].description.slice(5, results[i].description.length-1)] = results[i];
         }
         return resultLookup;
    },
    
    getRoutesFromServer: function(){
    	var this_ = this;
//    	console.log(this.fromStop);
//    	console.log(this.toStop);
    	if(this.fromStop != null && this.toStop != null && this.fromStop != this.toStop){
    		//TODO username
    		var url = otp.config.hostname + '/' + otp.config.restService + '/index/stops/' + this.fromStop + '/' + this.toStop + '/routes';
    		var loginStatus = (this.hasModule ? this_.routesControl.tripWidget.module.checkLoginStatus() : $('#otp-username :first-child').html());    //TODO
    		if(loginStatus != "-1"){
    			url = otp.config.hostname + '/otp/routers/' + loginStatus + '/index/stops/' + this.fromStop + '/' + this.toStop + '/routes';
    		}
    		$.ajax(url, {
    			success: function(data){
    				console.log(data);
    				this_.routeList.empty();
    				for(var i=0; i < data.length; i++){
    					var option = $('<option value="'+ data[i].id +'">'+ data[i].id.split(':')[1] +'</option>');
    					option.attr('title', data[i].id);
    					this_.routeList.append(option);
    				}
    			},
    		});
    	}
    },
    
    updateRouteList : function() {
        
    },

    selectRoute : function(agencyAndId) {
    	console.log(agencyAndId);
        if(!agencyAndId || _.contains(this.selectedRouteIds, agencyAndId)) return;
        var route, option;
        if(this.routesControl.id == "otp-planner-optionsWidget-ForcedRoutes" || this.id == "otp-userConfigurationWidget-selectorWidget2"){
        	route = this.indexApi.routes[agencyAndId.split("(")[0]].routeData;
            option = $('<option value="'+agencyAndId+'">'+ agencyAndId.split(":")[1] +'</option>');
            option.attr('title', agencyAndId);
            this.selectedStops.push({
            	fromStop: this.fromStop,
            	toStop: this.toStop,
            	fromCord: this.fromCord,
            	toCord: this.toCord,
            })
        }
        else{
        	route = this.indexApi.routes[agencyAndId].routeData;
            option = $('<option value="'+agencyAndId+'">'+ route.id.split(":")[1] +'</option>');
            option.attr('title', route.id);
        }
        this.selectedList.append(option);
        this.selectedRouteIds.push(agencyAndId);
    },

//    updateRouteList : function() {
//        if(this.initializedRoutes) return;
//        var this_ = this;
//
//        this.routeList.empty();
//        console.log(this.routesControl.tripWidget.module.webapp.indexApi);
////        this.indexApi.loadRoutes(this, function() {
//        this_.restoreSelected();
//        this_.initializedRoutes = true;
////        });
//
//    },
//
//    restoreSelected : function() {
//        this.clearSelected();
//        var i = 0;
//        for(agencyAndId in this.indexApi.routes) {
//            var route = this.indexApi.routes[agencyAndId].routeData;
//            var option = $('<option value="'+agencyAndId+'">'+route.id.split(':')[1]+'</option>');
//            option.attr('title', route.id);
//            this.routeList.append(option);
//            if(_.contains(this.restoredRouteIds, agencyAndId)) {
//                this.selectRoute(agencyAndId);
//            }
//            i++;
//        }
//    },

    clearSelected : function() {
        this.selectedList.empty();
        this.selectedRouteIds = [];
    }
});

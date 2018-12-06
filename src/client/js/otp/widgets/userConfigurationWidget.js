/**
 *  Shuai (19-12-2017)
 *  User configuration widget
 */

otp.namespace("otp.widgets");

otp.widgets.userConfigurationWidget = 
	otp.Class(otp.widgets.Widget, {
		
	title: "User Configuration",
	id: null,
	webapp: null,
	
	currentPage: null,
	maxPage: 3,
	
	bikeTriangle: null,
	riskTriangle: null,
	
	co2_w: 0.33,
	time_w: 0.33,
	distance_w: 0.34,
	KRI_time_w: 0.25,
	KRI_flexibility_w: 0.25,
	KRI_safety_w: 0.25,
	KRI_cost_w: 0.25,
	
	// KPI/KRI from stakeholder assessment as a default configuration
	st_co2_w: null,
	st_time_w: null,
	st_distance_w: null,
	st_KRI_time_w: null,
	st_KRI_flexibility_w: null,
	st_KRI_safety_w: null,
	st_KRI_cost_w: null,
	
	bannedRoutes: null,
	forcedRoutes: null,
	passBy: null,
	bannedStops: null,
	
	//mark if the configuration is a new one or not
	isNewConf1: true,
	isNewConf2: true,
	isNewConf3: true,
	
	generalConfData: [],
	vehicleConfData: [],
	routesConfData: [],
	
	username: null,
	userrole: null,
		
	initialize: function(id, owner, options){

		this.webapp = owner;
		this.id = id;
		
		if('username' in options)
			this.username = options['username'];
		if('userrole' in options)
			this.userrole = options['userrole'];
		
	    var defaultOptions = {
		        cssClass : 'otp-defaultUserConfigurationWidget',
	            closeable : true,
	            minimizable : true,
	            openInitially : false,
		    };
		    
	    options = (typeof options != 'undefined') ? 
	        _.extend(defaultOptions, options) : defaultOptions;
	        
        otp.widgets.Widget.prototype.initialize.call(this, id, owner, options);
        this.mainDiv.addClass('otp-UserConfigurationWidget');
        
        var content = $('<div style="margin-top:20px"></div>');
        ich['otp-userConfiguration']({
        	configurationName: "Configuration Name",
        	file: "Select configuration file",
        	comment1: 'Click "Next" to continue',
        	costCO2: "Cost per kg CO2",
        	costHour: "Cost per hour",
        	CO2Km: "CO2 per KM",
        	costKm: "Cost per KM",
        	CO2KmSlow: "CO2 per KM (Slow)",
        	CO2KmFast: "CO2 per KM (Fast)",
        	boarding: "Boarding Time",
        	alighting: "Alighting Time",
        	speed: "Speed",
        	boardingRORO: "Boarding Time (RORO)",
        	alightingRORO: "Alighting Time (RORO)",
        	capacity: "Capacity",
        	del: "Delete",
        	previous: "Previous",
        	next: "Next",
        	finish: "Finish",
        	none: 'None',
        	edit: 'Edit',
        	bannedRoutes: 'Banned Routes',
        	forcedRoutes: 'Forced Routes',
        	passBy: 'Pass By',
        	bannedStops: 'Banned Stops',
            widgetID: this.id,
        }).appendTo(content);
        
	    this.setContent(content);
	    this.center();
	},
	
	doAfterLayout: function(){
		var this_ = this;

		this.currentPage = 1;
		
		//TODO
		var username;
		if(this.username == null)
			username = $('#otp-username :first-child').html();
		else
			username = this.username;
		console.log(username);
		
		if(!this.bikeTriangle) 
        	this.bikeTriangle = new otp.widgets.BikeTrianglePanel(this.id + '-triangle');
		
		this.bikeTriangle.onChanged = function() {
			console.log(this);
            var formData = this_.bikeTriangle.getFormData();
            this_.co2_w = formData.co2_w;
            this_.time_w = formData.time_w;
            this_.distance_w = formData.distance_w;
        };
        
		$('#' + this.id + '-reset').click(function(){
			this_.bikeTriangle.setValues(0.333, 0.333, 0.334);
			this_.co2_w = 0.333;
            this_.time_w = 0.333;
            this_.distance_w = 0.334;			
		});
		
		if(!this.riskTriangle)
			this.riskTriangle = new otp.widgets.RiskTrianglePanel(this.id + '-riskTriangle');

		this.riskTriangle.onChanged = function() {
            var formData = this_.riskTriangle.getFormData();
            this_.KRI_time_w = formData.time_w;
            this_.KRI_flexibility_w = formData.flexibility_w;
            this_.KRI_safety_w = formData.safety_w;
            this_.KRI_cost_w = formData.cost_w;
        };
        
		$('#' + this.id + '-riskReset').click(function(){
			this_.riskTriangle.setValues(0.25, 0.25, 0.25, 0.25);
			this_.KRI_time_w = 0.25;
            this_.KRI_flexibility_w = 0.25;
            this_.KRI_safety_w = 0.25;
            this_.KRI_cost_w = 0.25;
		});
        
        if(this.webapp.geocoders && this.webapp.geocoders.length > 0){
        	var geocoder = this.webapp.geocoders[0];
            this.selectorWidget1 = new otp.widgets.RoutesSelectorWidget(this.id+"-selectorWidget1", this, _tr("Banned routes"), geocoder, false);
            this.selectorWidget2 = new otp.widgets.RoutesSelectorWidget(this.id+"-selectorWidget2", this, _tr("Forced routes"), geocoder, false);
            this.selectorWidget3 = new otp.widgets.LocationSelectorWidget(this.id+"-selectorWidget3", this, _tr("Pass By"), geocoder, false);
            this.selectorWidget4 = new otp.widgets.LocationSelectorWidget(this.id+"-selectorWidget4", this, _tr("Banned Stops"), geocoder, false);
        }
        
        $('#'+this.id+'-bannedRoutesButton').button().click(function() {
            this_.selectorWidget1.updateRouteList();
            this_.selectorWidget1.show();
            if(this_.selectorWidget1.isMinimized) this_.selectorWidget1.unminimize();
            this_.selectorWidget1.bringToFront();
        });
        
        $('#'+this.id+'-forcedRoutesButton').button().click(function() {
            this_.selectorWidget2.updateRouteList();
            this_.selectorWidget2.show();
            if(this_.selectorWidget2.isMinimized) this_.selectorWidget2.unminimize();
            this_.selectorWidget2.bringToFront();
        });
        
        $('#'+this.id+'-passByButton').button().click(function() {
            this_.selectorWidget3.updateRouteList();
            this_.selectorWidget3.show();
            if(this_.selectorWidget3.isMinimized) this_.selectorWidget3.unminimize();
            this_.selectorWidget3.bringToFront();
        });
        
        $('#'+this.id+'-bannedStopsButton').button().click(function() {
            this_.selectorWidget4.updateRouteList();
            this_.selectorWidget4.show();
            if(this_.selectorWidget4.isMinimized) this_.selectorWidget4.unminimize();
            this_.selectorWidget4.bringToFront();
        });
		
		$('#' + this.id + '-steps').tabs({
			activate: function(event, ui){
				var id = ui.newTab[0].id;
				this_.currentPage = id.slice(-1);
//				console.log('current page:' + this_.currentPage);
				
				if(this_.currentPage == 1){
					$('#' + this_.id + '-previous').css("display", 'none');
					$('#' + this_.id + '-next').css("display", 'inline-block');
				}
				else if(this_.currentPage == this_.maxPage){
					$('#' + this_.id + '-next').css("display", 'none');
					$('#' + this_.id + '-previous').css("display", 'inline-block');
				}
				else{
					$('#' + this_.id + '-previous').css("display", 'inline-block');
					$('#' + this_.id + '-next').css("display", 'inline-block');
				}
			},
		});
		
		$('#' + this.id + '-previous').button().click(function(){
			$('#' + this_.id + '-steps').tabs( "option", "active", this_.currentPage-2);
		});
		
		$('#' + this.id + '-next').button().click(function(){
			$('#' + this_.id + '-steps').tabs( "option", "active", this_.currentPage);
		});
		
		$('#' + this.id + '-finish1').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Finish?", "Save", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/genericConfiguration/add';
				
				var configurationName = $('#' + this_.id + '-generalConfName').val();
				var costPerHour = $('#' + this_.id + '-costHour').val();
				var costPerKgCO2 = $('#' + this_.id + '-costCO2').val();
				var KPICO2 = this_.co2_w;
				var KPIDistance = this_.distance_w;
				var KPITime = this_.time_w;
				var KRISafety = this_.KRI_safety_w;
				var KRICost = this_.KRI_cost_w;
				var KRIFlexibility = this_.KRI_flexibility_w;
				var KRITime = this_.KRI_time_w;
				var transfer = '';
				var current = '';
				
				//pass also id of the configuration in case of editing.
				var id = '-1';
				if(this_.generalConfData != null)
					for(var i=0; i < this_.generalConfData.length; i++){
						if(this_.generalConfData[i].configurationName == configurationName){
							id = this_.isNewConf1 ? '-1' : this_.generalConfData[i].id;
							break;
						}
					}
				
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
				
					data: JSON.stringify({
						'id': id,
						'username': username,
						'configurationName': configurationName,
						'costPerHour': costPerHour,
						'costPerKgCO2': costPerKgCO2,
						'KPICO2': KPICO2,
						'KPIDistance': KPIDistance,
						'KPITime': KPITime,
						'KRISafety': KRISafety,
						'KRICost': KRICost,
						'KRIFlexibility': KRIFlexibility,
						'KRITime': KRITime,
						'transfer': transfer,
						'current': current,
					}),
					
					beforeSend: function(){
						//check the completeness of the data input
						if(this_.isNewConf1){
							if(!configurationName || configurationName == ''){
								otp.widgets.Dialogs.showOkDialog("Please enter configuration name", "Error");
								return false;
							}
							if(configurationName.includes("'") || configurationName.includes('"')){
								otp.widgets.Dialogs.showOkDialog("Configuration name can't contain \', \"", "Error");
								return false;
							}
							//check if configuration name already exists when adding a new configuration
							if(this_.generalConfData != null)
								for(var i=0; i < this_.generalConfData.length; i++){
									if(configurationName == this_.generalConfData[i].configurationName){
										otp.widgets.Dialogs.showOkDialog("Configuration name already exists", "Error");
										return false;
									}
								}
						}
						if(!costPerHour || costPerHour == '' || isNaN(costPerHour)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid cost per hour", "Error");
							return false;
						}
						if(!costPerKgCO2 || costPerKgCO2 == '' || isNaN(costPerKgCO2)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid cost per Kg CO2", "Error");
							return false;
						}
					},
					
					success: function(data){
						console.log(data);
						var newConf = {
							'username': username,
							'configurationName': configurationName,
							'costPerHour': costPerHour,
							'costPerKgCO2': costPerKgCO2,
							'KPICO2': KPICO2,
							'KPIDistance': KPIDistance,
							'KPITime': KPITime,
							'KRISafety': KRISafety,
							'KRICost': KRICost,
							'KRIFlexibility': KRIFlexibility,
							'KRITime': KRITime,
							'transfer': transfer,
							'current': current,
						}
						if(data == -1){
							otp.widgets.Dialogs.showOkDialog("Something wrong with server", "Error");
						}
						else if(data == 0){
							otp.widgets.Dialogs.showOkDialog("Configuration updated", "Success");
							newConf.id = id;
							var index = $('#' + this_.id + '-generalConfList').prop('selectedIndex') -1;
							this_.generalConfData[index] = newConf;
//							console.log(this_.generalConfData);
							this_.isNewConf1 = false;
							
							this_.updateTripOptionPanel(1, this_.generalConfData);
						}
						else{
							otp.widgets.Dialogs.showOkDialog("New Configuration added", "Success");
							newConf.id = data;
							this_.generalConfData.push(newConf);
							$('<option>' + newConf.configurationName + '</option>').appendTo($('#' + this_.id + '-generalConfList'));
							$('#' + this_.id + '-generalConfName').attr('disabled', true);
//							console.log(this_.generalConfData);
							this_.isNewConf1 = false;
							
							this_.updateTripOptionPanel(1, this_.generalConfData);
						}
					},
				});
			});
		});
		
		$('#' + this.id + '-finish2').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Finish?", "Save", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/vehicleConfiguration/add';
				
				var configurationName = $('#' + this_.id + '-vehicleConfName').val();
				var mode = $('#' + this_.id + '-vehicleList').val();
				console.log(mode);
				if(!mode || mode == ''){
					otp.widgets.Dialogs.showOkDialog("Please select a mode", "Error");
					return;
				}
				var speed, capacity, costPerKm, CO2PerKm, CO2PerKmSlow, CO2PerKmFast, boarding, alighting, boardingRoRo, alightingRoRo, current = '';
				switch(mode){
					case 'Truck':
						speed = $('#' + this_.id + '-speed').val();
						costPerKm = $('#' + this_.id + '-costKmTruck').val();
						CO2PerKm = $('#' + this_.id + '-CO2perKmTruck').val();
						boarding = $('#' + this_.id + '-boardingTruck').val();
						alighting = $('#' + this_.id + '-alightingTruck').val();
						break;
					case 'Train':
						capacity = $('#' + this_.id + '-capacityTrain').val();
						costPerKm = $('#' + this_.id + '-costKmTrain').val();
						CO2PerKm = $('#' + this_.id + '-CO2perKmTrain').val();
						boarding = $('#' + this_.id + '-boardingTrain').val();
						alighting = $('#' + this_.id + '-alightingTrain').val();
						break;
					case 'Ship':
						capacity = $('#' + this_.id + '-capacityShip').val();
						costPerKm = $('#' + this_.id + '-costKmShip').val();
						CO2PerKm = $('#' + this_.id + '-CO2perKmShip').val();
						CO2PerKmSlow = $('#' + this_.id + '-CO2perKmSlow').val();
						CO2PerKmFast = $('#' + this_.id + '-CO2perKmFast').val();
						boarding = $('#' + this_.id + '-boardingShip').val();
						alighting = $('#' + this_.id + '-alightingShip').val();
						boardingRoRo = $('#' + this_.id + '-boardingRORO').val();
						alightingRoRo = $('#' + this_.id + '-alightingRORO').val();
						break;
				}
				
				//pass also id of the configuration in case of editing.
				var id = '-1';
				if(this_.vehicleConfData != null)
					for(var i=0; i < this_.vehicleConfData.length; i++){
						if(this_.vehicleConfData[i].configurationName == configurationName){
							id = this_.isNewConf2 ? '-1' : this_.vehicleConfData[i].id;
							break;
						}
					}
				
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
				
					data: JSON.stringify({
						'id': id,
						'username': username,
						'configurationName': configurationName,
						'mode': mode,
						'speed': speed,
						'capacity': capacity,
						'costPerKm': costPerKm,
						'CO2PerKm': CO2PerKm,
						'CO2PerKmSlow': CO2PerKmSlow,
						'CO2PerKmFast': CO2PerKmFast,
						'boarding': boarding,
						'alighting': alighting,
						'boardingRoRo': boardingRoRo,
						'alightingRoRo': alightingRoRo,
						'current': current,
					}),
					
					beforeSend: function(){
						//check the completeness of the data input
						if(this_.isNewConf2){
							if(!configurationName || configurationName == ''){
								otp.widgets.Dialogs.showOkDialog("Please enter configuration name", "Error");
								return false;
							}
							if(configurationName.includes("'") || configurationName.includes('"')){
								otp.widgets.Dialogs.showOkDialog("Configuration name can't contain \', \"", "Error");
								return false;
							}
							//check if configuration name already exists when adding a new configuration
							if(this_.vehicleConfData != null)
								for(var i=0; i < this_.vehicleConfData.length; i++){
									if(configurationName == this_.vehicleConfData[i].configurationName){
										otp.widgets.Dialogs.showOkDialog("Configuration name already exists", "Error");
										return false;
									}
								}
						}
						if(!costPerKm || costPerKm == '' || isNaN(costPerKm)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid cost per KM", "Error");
							return false;
						}
						if(!CO2PerKm || CO2PerKm == '' || isNaN(CO2PerKm)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid number of CO2 per KM", "Error");
							return false;
						}
						if(!boarding || boarding == '' || isNaN(boarding)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid boarding time", "Error");
							return false;
						}
						if(!alighting || alighting == '' || isNaN(alighting)){
							otp.widgets.Dialogs.showOkDialog("Please enter a valid alighting time", "Error");
							return false;
						}
						switch(mode){
							case 'Truck':
								if(!speed || speed == '' || isNaN(speed)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid speed", "Error");
									return false;
								}
								break;
							case 'Train':
								if(!capacity || capacity == '' || isNaN(capacity)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid capacity", "Error");
									return false;
								}
								break;
							case 'Ship':
								if(!capacity || capacity == '' || isNaN(capacity)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid capacity", "Error");
									return false;
								}
								if(!CO2PerKmSlow || CO2PerKmSlow == '' || isNaN(CO2PerKmSlow)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid number of CO2 per KM for slow speed", "Error");
									return false;
								}
								if(!CO2PerKmFast || CO2PerKmFast == '' || isNaN(CO2PerKmFast)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid number of CO2 per KM for fast speed", "Error");
									return false;
								}
								if(!boardingRoRo || boardingRoRo == '' || isNaN(boardingRoRo)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid boarding time for RORO", "Error");
									return false;
								}
								if(!alightingRoRo || alightingRoRo == '' || isNaN(alightingRoRo)){
									otp.widgets.Dialogs.showOkDialog("Please enter a valid alighting time for RORO", "Error");
									return false;
								}
								break;
						}
					},
					
					success: function(data){
						console.log(data);
						var newConf = {
							'username': username,
							'configurationName': configurationName,
							'mode': mode,
							'speed': speed,
							'capacity': capacity,
							'costPerKm': costPerKm,
							'CO2PerKm': CO2PerKm,
							'CO2PerKmSlow': CO2PerKmSlow,
							'CO2PerKmFast': CO2PerKmFast,
							'boarding': boarding,
							'alighting': alighting,
							'boardingRoRo': boardingRoRo,
							'alightingRoRo': alightingRoRo,
							'current': current,
						};
						if(data == -1){
							otp.widgets.Dialogs.showOkDialog("Something wrong with server", "Error");
						}
						else if(data == 0){
							otp.widgets.Dialogs.showOkDialog("Configuration updated", "Success");
							newConf.id = id;
							var index = $('#' + this_.id + '-vehicleConfList').prop('selectedIndex') -1;
							this_.vehicleConfData[index] = newConf;
//							console.log(this_.vehicleConfData);
							this_.isNewConf2 = false;
							
							this_.updateTripOptionPanel(2, this_.vehicleConfData);
						}
						else{
							otp.widgets.Dialogs.showOkDialog("New Configuration added", "Success");
							newConf.id = data;
							this_.vehicleConfData.push(newConf);
							$('<option>' + newConf.configurationName + '</option>').appendTo($('#' + this_.id + '-vehicleConfList'));
							$('#' + this_.id + '-vehicleConfName').attr('disabled', true);
//							console.log(this_.vehicleConfData);
							this_.isNewConf2 = false;
							
							this_.updateTripOptionPanel(2, this_.vehicleConfData);
						}
					},
				});
			});
		});
		
		$('#' + this.id + '-finish3').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Finish?", "Save", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/routesConfiguration/add';
				
				var configurationName = $('#' + this_.id + '-routesConfName').val();
				var current = '';
				
				//pass also id of the configuration in case of editing.
				var id = '-1';
				if(this_.routesConfData != null)
					for(var i=0; i < this_.routesConfData.length; i++){
						if(this_.routesConfData[i].configurationName == configurationName){
							id = this_.isNewConf3 ? '-1' : this_.routesConfData[i].id;
							break;
						}
					}
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
				
					data: JSON.stringify({
						'id': id,
						'username': username,
						'configurationName': configurationName,
						'bannedRotues': this_.bannedRoutes,
						'forcedRoutes': this_.forcedRoutes,
						'passBy': this_.passBy,
						'bannedStops': this_.bannedStops,
						'current': current,
					}),
					
					beforeSend: function(){
						if(this_.isNewConf3){
							if(!configurationName || configurationName == ''){
								otp.widgets.Dialogs.showOkDialog("Please enter configuration name", "Error");
								return false;
							}
							if(configurationName.includes("'") || configurationName.includes('"')){
								otp.widgets.Dialogs.showOkDialog("Configuration name can't contain \', \"", "Error");
								return false;
							}
							//check if configuration name already exists when adding a new configuration
							if(this_.routesConfData != null)
								for(var i=0; i < this_.routesConfData.length; i++){
									if(configurationName == this_.routesConfData[i].configurationName){
										otp.widgets.Dialogs.showOkDialog("Configuration name already exists", "Error");
										return false;
									}
								}
						}
					},
					
					success: function(data){
						console.log(data);
						var newConf = {
								'username': username,
								'configurationName': configurationName,
								'bannedRoutes': this_.bannedRoutes,
								'forcedRoutes': this_.forcedRoutes,
								'passBy': this_.passBy,
								'bannedStops': this_.bannedStops,
								'current': current,
							};
						if(data == -1){
							otp.widgets.Dialogs.showOkDialog("Something wrong with server", "Error");
						}
						else if(data == 0){
							otp.widgets.Dialogs.showOkDialog("Configuration updated", "Success");
							newConf.id = id;
							var index = $('#' + this_.id + '-routesConfList').prop('selectedIndex') -1;
							this_.routesConfData[index] = newConf;
//							console.log(this_.routesConfData);
							this_.isNewConf3 = false;
							
							this_.updateTripOptionPanel(3, this_.routesConfData);
						}
						else{
							otp.widgets.Dialogs.showOkDialog("New Configuration added", "Success");
							newConf.id = data;
							this_.routesConfData.push(newConf);
							$('<option>' + newConf.configurationName + '</option>').appendTo($('#' + this_.id + '-routesConfList'));
							$('#' + this_.id + '-routesConfName').attr('disabled', true);
//							console.log(this_.routesConfData);
							this_.isNewConf3 = false;
							
							this_.updateTripOptionPanel(3, this_.routesConfData);
						}
					},
				});
			});
		});
		
		$('#' + this.id + '-delete1').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Delete this general configuration?", "Remove", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/genericConfiguration/remove';
				var configurationName = $('#' + this_.id + '-generalConfName').val();
				var id;
				for(var i=0; i < this_.generalConfData.length; i++){
					if(this_.generalConfData[i].configurationName == configurationName){
						id = this_.generalConfData[i].id;
						break;
					}
				}
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
					data: JSON.stringify({
						'username': username,
						'id': id,
					}),
					success: function(data){
						console.log(data);
						if(data){
							otp.widgets.Dialogs.showOkDialog("general configuration deleted", "configuration updated");
							var index = $('#' + this_.id + '-generalConfList').prop('selectedIndex') -1;
//							console.log($('#' + this_.id + '-generalConfList').prop('selectedIndex'));
//							console.log(index);
//							console.log(this_.generalConfData[index]);
							
							$('#' + this_.id + '-generalConfList option').each(function(){
								if($(this).val() == this_.generalConfData[index].configurationName){
//									console.log($(this).val());
									$(this).remove();
								}
							});
							for(var i = this_.generalConfData.length-1; i >= 0; i--){
								if(this_.generalConfData[i].configurationName == configurationName)
									this_.generalConfData.splice(i, 1);
							}
							this_.cleanAllPages(1);
						}
						else 
							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
					},
				});
			});
		});
		
		$('#' + this.id + '-delete2').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Delete this vehicle configuration?", "Remove", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/vehicleConfiguration/remove';
				var configurationName = $('#' + this_.id + '-vehicleConfName').val();
				var id;
				for(var i=0; i < this_.vehicleConfData.length; i++){
					if(this_.vehicleConfData[i].configurationName == configurationName){
						id = this_.vehicleConfData[i].id;
						break;
					}
				}
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
					data: JSON.stringify({
						'username': username,
						'id': id,
					}),
					success: function(data){
						console.log(data);
						if(data){
							otp.widgets.Dialogs.showOkDialog("vehicle configuration deleted", "configuration updated");
							var index = $('#' + this_.id + '-vehicleConfList').prop('selectedIndex') -1;
//							console.log($('#' + this_.id + '-vehicleConfList').prop('selectedIndex'));
//							console.log(index);
//							console.log(this_.vehicleConfData[index]);
							
							$('#' + this_.id + '-vehicleConfList option').each(function(){
								if($(this).val() == this_.vehicleConfData[index].configurationName){
//									console.log($(this).val());
									$(this).remove();
								}
							});
							for(var i = this_.vehicleConfData.length-1; i >= 0; i--){
								if(this_.vehicleConfData[i].configurationName == configurationName)
									this_.vehicleConfData.splice(i, 1);
							}
							this_.cleanAllPages(2);
						}
						else 
							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
					},
				});
			});
		});
		
		$('#' + this.id + '-delete3').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Delete this routes configuration?", "Remove", function(){
				var url = otp.config.hostname + '/otp/routers/' + username  + '/user/routesConfiguration/remove';
				var configurationName = $('#' + this_.id + '-routesConfName').val();
				var id;
				for(var i=0; i < this_.routesConfData.length; i++){
					if(this_.routesConfData[i].configurationName == configurationName){
						id = this_.routesConfData[i].id;
						break;
					}
				}
				$.ajax(url, {
					type: 'POST',
					dataType: 'JSON',
					contentType: "application/json",
					data: JSON.stringify({
						'username': username,
						'id': id,
					}),
					success: function(data){
						console.log(data);
						if(data){
							otp.widgets.Dialogs.showOkDialog("routes configuration deleted", "configuration updated");
							var index = $('#' + this_.id + '-routesConfList').prop('selectedIndex') -1;
//							console.log($('#' + this_.id + '-routesConfList').prop('selectedIndex'));
//							console.log(index);
//							console.log(this_.routesConfData[index]);
							
							$('#' + this_.id + '-routesConfList option').each(function(){
								if($(this).val() == this_.routesConfData[index].configurationName){
//									console.log($(this).val());
									$(this).remove();
								}
							});
							for(var i = this_.routesConfData.length-1; i >= 0; i--){
								if(this_.routesConfData[i].configurationName == configurationName)
									this_.routesConfData.splice(i, 1);
							}
							this_.cleanAllPages(3);
						}
						else 
							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
					},
				});
			});
		});
		
		$('#' + this.id + '-clean1').attr('title', 'clean this page').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Clean current page?", "Clean", function(){
				console.log("general configuration clean");
				this_.cleanAllPages(1);
			});
		});
		
		$('#' + this.id + '-clean2').attr('title', 'clean this page').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Clean current page?", "Clean", function(){
				console.log("vehicle configuration clean");
				this_.cleanAllPages(2);
			});
		});
		
		$('#' + this.id + '-clean3').attr('title', 'clean this page').button().click(function(){
			otp.widgets.Dialogs.showYesNoDialog("Clean current page?", "Clean", function(){
				console.log("routes configuration clean");
				this_.cleanAllPages(3);
			});
		});
		
		$('#' + this.id + '-vehicleList').change(function(){
			var index = this.selectedIndex;
			switch(index){ 
				case 0:
					$('#' + this_.id + '-descriptionTruck').css('display', 'none');
					$('#' + this_.id + '-descriptionTrain').css('display', 'none');
					$('#' + this_.id + '-descriptionShip').css('display', 'none');
					$('#' + this_.id + '-truck').css('display', 'none');
					$('#' + this_.id + '-train').css('display', 'none');
					$('#' + this_.id + '-ship').css('display', 'none');
					break;
					
				case 1: 
					$('#' + this_.id + '-descriptionTruck').css('display', 'block');
					$('#' + this_.id + '-descriptionTrain').css('display', 'none');
					$('#' + this_.id + '-descriptionShip').css('display', 'none');
					$('#' + this_.id + '-truck').css('display', 'block');
					$('#' + this_.id + '-train').css('display', 'none');
					$('#' + this_.id + '-ship').css('display', 'none');
					break;
					
				case 2:
					$('#' + this_.id + '-descriptionTruck').css('display', 'none');
					$('#' + this_.id + '-descriptionTrain').css('display', 'block');
					$('#' + this_.id + '-descriptionShip').css('display', 'none');
					$('#' + this_.id + '-truck').css('display', 'none');
					$('#' + this_.id + '-train').css('display', 'block');
					$('#' + this_.id + '-ship').css('display', 'none');
					break;
					
				case 3:
					$('#' + this_.id + '-descriptionTruck').css('display', 'none');
					$('#' + this_.id + '-descriptionTrain').css('display', 'none');
					$('#' + this_.id + '-descriptionShip').css('display', 'block');
					$('#' + this_.id + '-truck').css('display', 'none');
					$('#' + this_.id + '-train').css('display', 'none');
					$('#' + this_.id + '-ship').css('display', 'block');
					break;
			}
		});		
		
		$('<option selected disabled>Select general configuration</option>').appendTo($('#' + this.id + '-generalConfList'));
		//get existing configurations
		var url = otp.config.hostname + '/otp/routers/' + username  + '/user/genericConfiguration/getList';
		$.ajax(url, {
			success: function(data){
//				console.log(data);
				if(data != null){
					this_.generalConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-generalConfList'));
					}
					
					if(this_.username == null){
						this_.updateTripOptionPanel(1, this_.generalConfData);
					}
				}
			},
		});
		$('#' + this.id + '-generalConfList').change(function(){
			$('#' + this_.id + '-delete1').css('display', 'inline-block');
			this_.isNewConf1 = false;
			
			var index = this.selectedIndex - 1;
			console.log(index);
			var content = this_.generalConfData[index];
			
			$('#' + this_.id + '-generalConfName').attr('disabled', true).val(content.configurationName);
			$('#' + this_.id + '-costCO2').val(content.costPerKgCO2);
			$('#' + this_.id + '-costHour').val(content.costPerHour);
			this_.bikeTriangle.setValues(content.KPICO2, content.KPITime, content.KPIDistance);
			this_.riskTriangle.setValues(content.KRITime, content.KRIFlexibility, content.KRISafety, content.KRICost);
		});
		
		$('<option selected disabled>Select vehicle configuration</option>').appendTo($('#' + this.id + '-vehicleConfList'));		
		//get existing configurations
		var url = otp.config.hostname + '/otp/routers/' + username  + '/user/vehicleConfiguration/getList';
		$.ajax(url, {
			success: function(data){
//				console.log(data);
				if(data != null){
					this_.vehicleConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-vehicleConfList'));
					}
					
					if(this_.username == null){
						this_.updateTripOptionPanel(2, this_.vehicleConfData);
					}
				}
			},
		});
		$('#' + this.id + '-vehicleConfList').change(function(){
			$('#' + this_.id + '-delete2').css('display', 'inline-block');
			this_.isNewConf2 = false;
			
			var index = this.selectedIndex - 1;
			var content = this_.vehicleConfData[index];
			
			$('#' + this_.id + '-vehicleConfName').attr('disabled', true).val(content.configurationName);
			$('#' + this_.id + '-vehicleList').attr('disabled', true);
			switch(content.mode){
				case 'Truck':
					$('#' + this_.id + '-vehicleList')[0].selectedIndex = 1;
					$('#' + this_.id + '-vehicleList').change();
					$('#' + this_.id + '-speed').val(content.speed);
					$('#' + this_.id + '-costKmTruck').val(content.costPerKm);
					$('#' + this_.id + '-CO2perKmTruck').val(content.CO2PerKm);
					$('#' + this_.id + '-boardingTruck').val(content.boarding);
					$('#' + this_.id + '-alightingTruck').val(content.alighting);
					break;
				case 'Train':
					$('#' + this_.id + '-vehicleList')[0].selectedIndex = 2;
					$('#' + this_.id + '-vehicleList').change();
					$('#' + this_.id + '-capacityTrain').val(content.capacity);
					$('#' + this_.id + '-costKmTrain').val(content.costPerKm);
					$('#' + this_.id + '-CO2perKmTrain').val(content.CO2PerKm);
					$('#' + this_.id + '-boardingTrain').val(content.boarding);
					$('#' + this_.id + '-alightingTrain').val(content.alighting);
					break;
				case 'Ship':
					$('#' + this_.id + '-vehicleList')[0].selectedIndex = 3;
					$('#' + this_.id + '-vehicleList').change();
					$('#' + this_.id + '-capacityShip').val(content.capacity);
					$('#' + this_.id + '-costKmShip').val(content.costPerKm);
					$('#' + this_.id + '-CO2perKmShip').val(content.CO2PerKm);
					$('#' + this_.id + '-CO2perKmSlow').val(content.CO2PerKmSlow);
					$('#' + this_.id + '-CO2perKmFast').val(content.CO2PerKmFast);
					$('#' + this_.id + '-boardingShip').val(content.boarding);
					$('#' + this_.id + '-alightingShip').val(content.alighting);
					$('#' + this_.id + '-boardingRORO').val(content.boardingRoRo);
					$('#' + this_.id + '-alightingRORO').val(content.alightingRoRo);
					break;
			}
		});
		
		$('<option selected disabled>Select routes configuration</option>').appendTo($('#' + this.id + '-routesConfList'));		
		//get existing configurations
		var url = otp.config.hostname + '/otp/routers/' + username  + '/user/routesConfiguration/getList';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.routesConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-routesConfList'));
					}
					
					if(this_.username == null){
						this_.updateTripOptionPanel(3, this_.routesConfData);
					}
				}
			},
		});
		$('#' + this.id + '-routesConfList').change(function(){
			$('#' + this_.id + '-delete3').css('display', 'inline-block');
			this_.isNewConf3 = false;
			
			var index = this.selectedIndex - 1;
			var content = this_.routesConfData[index];
//			console.log(content);
			
			$('#' + this_.id + '-routesConfName').attr('disabled', true).val(content.configurationName);
			
			//update banned/forced routes/stops
			var bannedRoutesList = this_.manipulateList(content.bannedRoutes, ',');
			var forcedRoutesList = this_.manipulateList(content.forcedRoutes, ',');
			var passByList = this_.manipulateList(content.passBy, ';');
			var bannedStopsList = this_.manipulateList(content.bannedStops, ';');
			//displayStr to be changed here or in routesSelectorWidget
//			console.log('after manipulate:')
//			console.log(content);
//			console.log(bannedRoutesList);
//			console.log(forcedRoutesList);
//			console.log(passByList);
//			console.log(bannedStopsList);
			this_.setRoutes(content.bannedRoutes, bannedRoutesList.join(','), this_.id+'-selectorWidget1');
			this_.setRoutes(content.forcedRoutes, forcedRoutesList.join(','), this_.id+'-selectorWidget2');
			this_.setRoutes(content.passBy, passByList.join(','), this_.id+'-selectorWidget3');
			this_.setRoutes(content.bannedStops, bannedStopsList.join(','), this_.id+'-selectorWidget4');
			//update also inside the route/stop selector
			this_.setSelectedList('#' + this_.id + '-selectorWidget1-selectedList', bannedRoutesList, content.bannedRoutes, this_.selectorWidget1, ',');
			this_.setSelectedList('#' + this_.id + '-selectorWidget2-selectedList', forcedRoutesList, content.forcedRoutes, this_.selectorWidget2, ',');
			this_.setSelectedList('#' + this_.id + '-selectorWidget3-selectedList', passByList, content.passBy, this_.selectorWidget3, ';');
			this_.setSelectedList('#' + this_.id + '-selectorWidget4-selectedList', bannedStopsList, content.bannedStops, this_.selectorWidget4, ';');
		});
		
		//we will use the data from stakeholder assessment module to fill the KPI/KRI. No need to upload file manually.
//		$('#' + this.id + '-file').change(function(e){
//			var file = e.target.files[0];
//			if (!file) {
//				return;
//			}
//			var reader = new FileReader();
//			reader.onload = function(e){
//				console.log("onload");
//				console.log(this);
//				console.log(e);
//				
//				//manage KPI/KRI
//				
//			};
//			reader.readAsText(file);
//		});
		
		//load KPI/KRI if stakeholder config is set
		var url  = otp.config.hostname + '/otp/stakeholderAssessment/get/?userrole=' + this_.userrole; 
		$.ajax(url, {
			type: 'GET',
			dataType: 'JSON',
			contentType: "application/json",
			success: function(data){
				console.log(data);
				if(data != null){
					this_.st_co2_w = data.kpico2;
					this_.st_time_w = data.kpitime;
					this_.st_distance_w = data.kpidistance;
					this_.st_KRI_time_w = data.kritime;
					this_.st_KRI_flexibility_w = data.kriflexibility;
					this_.st_KRI_safety_w = data.krisafety;
					this_.st_KRI_cost_w = data.kricost;
					
					this_.co2_w = this_.st_co2_w;
					this_.time_w = this_.st_time_w;
					this_.distance_w = this_.st_distance_w;
					this_.KRI_time_w = this_.st_KRI_time_w;
					this_.KRI_flexibility_w = this_.st_KRI_flexibility_w;
					this_.KRI_safety_w = this_.st_KRI_safety_w;
					this_.KRI_cost_w = this_.st_KRI_cost_w;
					
					this_.bikeTriangle.setValues(this_.st_co2_w, this_.st_time_w, this_.st_distance_w);
					this_.riskTriangle.setValues(this_.st_KRI_time_w, this_.st_KRI_flexibility_w, this_.st_KRI_safety_w, this_.st_KRI_cost_w);
				}
			}
		})
	},
	
	manipulateList: function(list, separator){
		console.log('list: ' + list);
		if(list != null){
			var data = list.split(separator);
			for(var i=0; i < data.length; i++){
				if(separator == ',')
					//route
					data[i] = data[i].split('__')[1];
				else if(separator == ';')
					//stop
					data[i] = data[i].split(':')[0];
			}
	//		console.log(data);
			return data;
		}
		else
			return [];
	},
	
	setSelectedList: function(id, data, title, selectWidget, separator){
		$(id).empty();
//		console.log(selectWidget.selectedRouteIds);
		selectWidget.selectedRouteIds = [];
		for(var i=0; i < data.length; i++){
			if(data[i] != null){
				$('<option>' + data[i] + '</option>').attr('title', title.split(separator)[i]).appendTo($(id));
//				console.log(title.split(',')[i].replace('__', ':'));
				selectWidget.selectedRouteIds.push(title.split(separator)[i].replace('__', ':'));
			}
		}
//		console.log(selectWidget.selectedRouteIds);
	},
	
	setRoutes : function(param, displayStr, id) {
		switch(id){
			case this.id+'-selectorWidget1':
				this.bannedRoutes = param;
				$('#'+this.id+'-bannedRoutesList').html(displayStr);
				break;
			case this.id+'-selectorWidget2':
				this.forcedRoutes = param;
				$('#'+this.id+'-forcedRoutesList').html(displayStr);
				break;
			case this.id+'-selectorWidget3':
				this.passBy = param;
				$('#'+this.id+'-passByList').html(displayStr);
				break;
			case this.id+'-selectorWidget4':
				this.BannedStops = param;
				$('#'+this.id+'-bannedStopsList').html(displayStr);
				break;
		}
    },
    
    updateTripOptionPanel: function(index, data){
    	var this_ = this;
    	for(var i=0; i < this_.webapp.modules.length; i++){
    		if(this_.webapp.modules[i].id == 'planner'){
    			switch(index){
	    			case 1:
	    				for(var j=0; j < this_.webapp.modules[i].optionsWidget.controls.Group2.widgets.length; j++){
	    					var w = this_.webapp.modules[i].optionsWidget.controls.Group2.widgets[j];
	    					if(w.id == 'otp-planner-optionsWidget-generalConfigurationWidget'){
	    						w.updateInfo(index, data);
	    					}
	    				}
	    				break;
	    			case 2:
	    				for(var j=0; j < this_.webapp.modules[i].optionsWidget.controls.Group2.widgets.length; j++){
	    					var w = this_.webapp.modules[i].optionsWidget.controls.Group2.widgets[j];
	    					if(w.id == 'otp-planner-optionsWidget-vehicleConfigurationWidget'){
	    						w.updateInfo(index, data);
	    					}
	    				}
	    				break;
	    			case 3:
	    				for(var j=0; j < this_.webapp.modules[i].optionsWidget.controls.Group1.widgets.length; j++){
	    					var w = this_.webapp.modules[i].optionsWidget.controls.Group1.widgets[j];
	    					if(w.id == 'otp-planner-optionsWidget-routesConfigurationWidget'){
	    						w.updateInfo(index, data);
	    					}
	    				}
	    				break;
    			}
    			break;
    		}
    	}
    },
	
	cleanAllPages: function(index){
		console.log('clean page ' + index);
		
		//TODO
		
		//page1
		if(index == 1){
			this.isNewConf1 = true;
			$('#' + this.id + '-generalConfList')[0].selectedIndex = 0;
			$('#' + this.id + '-delete1').css('display', 'none');
			$('#' + this.id + '-generalConfName').removeAttr('disabled').val('');
			$('#' + this.id + '-costCO2').val('');
			$('#' + this.id + '-costHour').val('');
			$('#' + this.id + '-file').val('');
			$('#' + this.id + '-reset').click();
			$('#' + this.id + '-riskReset').click();
			this.co2_w = 0.33;
			this.time_w = 0.33;
			this.distance_w = 0.34;
			this.KRI_time_w = 0.25;
			this.KRI_flexibility_w = 0.25;
			this.KRI_safety_w = 0.25;
			this.KRI_cost_w = 0.25;
			
			if(this.st_co2_w != null){
				this.co2_w = this.st_co2_w;
				this.time_w = this.st_time_w;
				this.distance_w = this.st_distance_w;
				this.KRI_time_w = this.st_KRI_time_w;
				this.KRI_flexibility_w = this.st_KRI_flexibility_w;
				this.KRI_safety_w = this.st_KRI_safety_w;
				this.KRI_cost_w = this.st_KRI_cost_w;
				this.bikeTriangle.setValues(this.st_co2_w, this.st_time_w, this.st_distance_w);
				this.riskTriangle.setValues(this.st_KRI_time_w, this.st_KRI_flexibility_w, this.st_KRI_safety_w, this.st_KRI_cost_w);
			}
		}
		
		//page2
		if(index == 2){
			this.isNewConf2 = true;
			$('#' + this.id + '-vehicleConfList')[0].selectedIndex = 0;
			$('#' + this.id + '-delete2').css('display', 'none');
			$('#' + this.id + '-vehicleConfName').removeAttr('disabled').val('');
			$('#' + this.id + '-vehicleList')[0].selectedIndex = 0;
			$('#' + this.id + '-vehicleList').removeAttr('disabled');
			$('#' + this.id + '-vehicleList').change();
			$('#' + this.id + '-costKmTruck').val('');
			$('#' + this.id + '-CO2perKmTruck').val('');
			$('#' + this.id + '-boardingTruck').val('');
			$('#' + this.id + '-alightingTruck').val('');
			$('#' + this.id + '-speed').val('');
			$('#' + this.id + '-costKmTrain').val('');
			$('#' + this.id + '-CO2perKmTrain').val('');
			$('#' + this.id + '-boardingTrain').val('');
			$('#' + this.id + '-alightingTrain').val('');
			$('#' + this.id + '-capacityTrain').val('');
			$('#' + this.id + '-costKmShip').val('');
			$('#' + this.id + '-CO2perKmShip').val('');
			$('#' + this.id + '-CO2perKmSlow').val('');
			$('#' + this.id + '-CO2perKmFast').val('');
			$('#' + this.id + '-boardingShip').val('');
			$('#' + this.id + '-alightingShip').val('');
			$('#' + this.id + '-boardingRORO').val('');
			$('#' + this.id + '-alightingRORO').val('');
			$('#' + this.id + '-capacityShip').val('');
		}
		
		//page3
		if(index == 3){
			this.isNewConf3 = true;
			$('#' + this.id + '-routesConfList')[0].selectedIndex = 0;
			$('#' + this.id + '-delete3').css('display', 'none');
			$('#' + this.id + '-routesConfName').removeAttr('disabled').val('');
			$('#' + this.id + '-bannedRoutesList').html('none');
			$('#' + this.id + '-forcedRoutesList').html('none');
			$('#' + this.id + '-passByList').html('none');
			$('#' + this.id + '-bannedStopsList').html('none');
			this.selectorWidget1.clearSelected();
			this.selectorWidget2.clearSelected();
			this.selectorWidget3.cleanAll();
			this.selectorWidget4.cleanAll();
			this.bannedRoutes = null;
			this.forcedRoutes = null;
			this.passBy = null;
			this.bannedStops = null; 
		}
	},
});
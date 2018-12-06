/**
 * Shuai (06-11-2017) Add new gtfs route
 */

otp.namespace("otp.widgets");

otp.widgets.RouteAdderWidget =
    otp.Class(otp.widgets.Widget, {
    
    control: null,
    routes: [],
    stops: [], 
    services: [],
    calendarDates: [],
    isSingleDate: false,
        	
    initialize : function(id, control, name) {
    	var this_ = this;
        this.control = control;
        
        otp.widgets.Widget.prototype.initialize.call(this, id, control.gtfsEditor.owner, {
            openInitially : false,
            title : name
        });
        
        ich['otp-gtfsEditor-routeEditor-Adder']({
            from: _tr("From"),
            to: _tr("To"),
            mode: _tr("Mode"),
            agency: _tr("Agency"),
            service: _tr("Service"),
            arrive: _tr("Arrival Time"),
            departure: _tr("Departure Time"),
            frequency: _tr("Frequency"),
            startTime: _tr("startTime"),
            endTime: _tr("endTime"),
            headway: _tr("headway"),
            shape: _tr("Shape"),
            add: _tr("Add new route"),
            close: _tr("Close"),
            widgetID: this.id
	    }).appendTo(this.$()); 
        
        $('#' + this.id + '-shape').click(function(){
        	this_.control.shapeWidget.show();
    		if(this_.control.shapeWidget.isMinimized) this_.control.shapeWidget.unminimize();
            this_.control.shapeWidget.bringToFront();
        });
        
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
			for(var i=0; i < this_.services.length; i++){
				if(this_.services[i].serviceId == $(this).val()){
					if(!('monday' in this_.services[i])){
						//the service doesnt contain the weekly periodic calendar
						console.log($(this).val() + " has no weekly periodic calendar");
						for(var j=0; j < this_.calendarDates.length; j++){
							if(this_.calendarDates[j].serviceId == $(this).val()){
								dates.push(this_.calendarDates[j]);
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
        
        $('#' + this.id + '-add').click(function(){
			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/route/add';
			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
			if(loginStatus != "-1"){
				url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/route/add';
			}
			var from = $('#' + this_.id + '-from').val();
			var to = $('#' + this_.id + '-to').val();
			var mode = $('#' + this_.id + '-mode').val();
			var submode = $('#' + this_.id + '-submode').val();
			if(submode != null)
				mode += '_' + submode;
			console.log(mode);
			
			//check if the route already exists
			//add postfix to the already existing route
			var routeId = from.trim().toUpperCase() + '_' + to.trim().toUpperCase() + '_' + mode;
			var index = 0;
			for(var i=0; i < this_.routes.length; i++){
				var temp = this_.routes[i].id.split(':')[1];
				if(temp.includes(routeId)){ 
					var val = temp.split('_')[temp.split('_').length -1];
					if(Number.isInteger(parseInt(val))){
						if(parseInt(val) > index)
							index = parseInt(val);
					}
					else{
						if(index == 0)
							index = 1;
					}
				}
			}console.log(index);
			if(index != 0)
				routeId = routeId + '_' + (index + 1);
			
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
			
			var agency = $('#' + this_.id + '-agency').val();
			var service = $('#' + this_.id + '-service').val();
			
			var frequency;
			var startTime = $('#' + this_.id + '-startTime').val();
			var endTime = $('#' + this_.id + '-endTime').val();
			var headway = $('#' + this_.id + '-headway').val()*60;
			if($('#' + this_.id + '-frequencyCheckbox').prop("checked"))
				frequency = true;
			else
				frequency = false;
			
			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
			var length = this_.control.calculateShapeDistance();
			console.log(this_.isSingleDate);
			$.ajax(url, {
				type: 'POST',
				data: JSON.stringify({
					'routeId': routeId,
					'from': from,
					'to': to,
					'mode': mode,
					'agency': agency,
					'shape': this_.control.points,
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
				}),
				dataType: 'JSON',
				contentType: "application/json",
				
				beforeSend: function(){
					if(from == null || to == null || mode == null || service == null){
						otp.widgets.Dialogs.showOkDialog("Please select Departure/Arrival/Mode/Service", "Error");
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
					
					if(index != 0)
						otp.widgets.Dialogs.showOkDialog("The new ID will be " + routeId, "Route already exists");
				},
				
				success: function(val){
					switch (val){
						case 0:
							otp.widgets.Dialogs.showOkDialog("New route added", "GTFS updated");
							var feedId = this_.stops[0].id.split(':')[0];
							var route = {
								'id': feedId + ':' + routeId,
								'from': from,
								'to': to,
								'mode': mode,
								'agency': agency,
								'desc': "type:custom",
							}
							this_.control.setRoute(route);
							break;
							
						case -1:
							otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
							break;
					}
				},
			});
        });
        
        $('#' + this.id + '-close').click(function(){
        	this_.control.clear();
        	this_.control.restore();
        	this_.control.enableButton();
        	$('#' + this_.id + '-mode').val('');
			$('#' + this_.id + '-agency').val('');
			$('#' + this_.id + '-mode option').eq(0).prop('selected', true);
			$('#' + this_.id + '-submode').addClass('hideInfo');
			$('#' + this_.id + '-submode option').eq(0).prop('selected', true);
			
			this_.isSingleDate = false;
			this_.$().find('div[name="multipleDates"]').each(function(){
				$(this).css("display", "block");
			});
			this_.$().find('div[name="singleDate"]').each(function(){
				$(this).css("display", "none");
			});
			$('#' + this_.id + '-departure').val('');
			$('#' + this_.id + '-arriveDays').val('');
			$('#' + this_.id + '-arrive').val('');
			$('#' + this_.id + '-arriveTime').val('');
			$('#' + this_.id + '-departureTime').val('');
			$('#' + this_.id + '-arriveDate').datepicker("setDate", new Date());
			
			var div = this_.$().find('div[name="f"]');
			for(var i=0; i<div.length; i++)
				$(div[i]).css('display', 'none');
			$('#' + this_.id + '-frequencyCheckbox').removeProp("checked");
			$('#' + this_.id + '-startTime').val('');
			$('#' + this_.id + '-endTime').val('');
			$('#' + this_.id + '-headway').val('');
        });
        
        $('#' + this.id + '-from').change(function(){
    		var index = this.selectedIndex -1;
    		var content = this_.stops[index];
    		this_.control.startPoint = new L.LatLng(content.lat, content.lon);
    		this_.control.gtfsEditor.owner.webapp.map.lmap.panTo(this_.control.startPoint);
    		this_.control.addLine(true);
    	});
        
        $('#' + this.id + '-to').change(function(){
    		var index = this.selectedIndex -1;
    		var content = this_.stops[index];
    		this_.control.endPoint = new L.LatLng(content.lat, content.lon);
    		this_.control.addLine(true);
    	});
        
        $('#' + this.id + '-mode').change(function(){
    		if($(this).val() == 'FERRY')
    			$('#' + this_.id + '-submode').removeClass('hideInfo');
    		else{
    			$('#' + this_.id + '-submode').addClass('hideInfo');
    			$('#' + this_.id + '-submode option').eq(0).prop('selected', true);
    		}
    	});
    },
    
    setStops: function(stops){
    	this.stops = stops;
		$('#' + this.id + '-from').empty();
		$('#' + this.id + '-to').empty();
    	$('<option selected disabled>Select Departure</option>').appendTo($('#' + this.id + '-from'));
    	$('<option selected disabled>Select Arrival</option>').appendTo($('#' + this.id + '-to'));
    	for(var i=0; i < stops.length; i++){
    		$('<option>' + stops[i].name + '</option>').appendTo($('#' + this.id + '-from'));
    		$('<option>' + stops[i].name + '</option>').appendTo($('#' + this.id + '-to'));
    	}
    },
    
    setServices: function(services, calendarDates){
    	this.services = services;
    	this.calendarDates = calendarDates;
		$('#' + this.id + '-service').empty();
    	$('<option selected disabled>Select Services</option>').appendTo($('#' + this.id + '-service'));
    	for(var i=0; i < services.length; i++){
    		$('<option>' + services[i].serviceId + '</option>').appendTo($('#' + this.id + '-service'));
    	}
    },
    
    clear: function(){
    	this.close();
    },
})
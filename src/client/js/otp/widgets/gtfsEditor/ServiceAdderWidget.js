/**
 * Shuai (20-10-2017) Add new gtfs service
 */

otp.namespace("otp.widgets");

otp.widgets.ServiceAdderWidget =
    otp.Class(otp.widgets.Widget, {
    
    control: null,
    services: [],
    
    startdate: null,
    enddate: null,
    
    index: null, //for unique id only
    counter: [], //for counting the number of exceptions occurred of each day (Mon,Tue...)
        	
    initialize : function(id, control, name) {
    	var this_ = this;
        this.control = control;
        this.index = 0;
        for(var i=0; i<7; i++)
        	this.counter[i] = 0;
        
        otp.widgets.Widget.prototype.initialize.call(this, id, control.gtfsEditor.owner, {
            openInitially : false,
            title : name
        });
        
        ich['otp-gtfsEditor-serviceEditor-Adder']({
        	id: _tr("ID"),
	    	sun: _tr("Sun"),
	    	mon: _tr("Mon"),
	    	tue: _tr("Tue"),
	    	wed: _tr("Wed"),
	    	thu: _tr("Thu"),
	    	fri: _tr("Fri"),
	    	sat: _tr("Sat"),
	    	start: _tr("Start Date"),
	    	end: _tr("End Date"),
	    	add: _tr("Add new service"),
            close: _tr("Close"),
            widgetID: this.id
	    }).appendTo(this.$()); 
        
        //change of checkbox may affect exceptions
        var checkboxes = $('#otp-gtfs-serviceEditor-adderWidget-table input[type="checkbox"]');
        for(var i=0; i < checkboxes.length; i++){
        	$(checkboxes[i]).data('index', i).change(function(){
        		var thisCheckbox = this;       		
        		var index = $(this).data('index');
        		console.log(index + ' : ' + $(this).prop('checked'));
        		
        		if(this_.counter[index] != 0){
        			console.log(this_.counter);
        			otp.widgets.Dialogs.showYesNoDialog('' + this_.counter[index] + ' of the exceptions will be deleted! Continue?', 'Warning', function(){
        				//Yes, then delete the corresponding exceptions
        				var tempInclude = $('#otp-gtfs-serviceEditor-adderWidget-includedDates div');
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
        				
        				var tempExclude = $('#otp-gtfs-serviceEditor-adderWidget-excludedDates div');
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
                
		$('#'+this.id+'-startdate').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
            	this_.startdate = date; 
            },
        });
		$('#'+this.id+'-startdate').datepicker('setDate', new Date());
		$('#'+this.id+'-enddate').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
            	this_.enddate = date;
            },
            setDate: new Date(),
        });
		$('#'+this.id+'-enddate').datepicker('setDate', new Date());
		
		//add exceptions
		$('#'+this.id+'-includedDates').css("max-width", this.$().width());
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
		$('#'+this.id+'-excludedDates').css("max-width", this.$().width());
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
        
        $('#' + this.id + '-add').click(function(){
			var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/service/add';
			var loginStatus = this_.control.gtfsEditor.owner.checkLoginStatus();
			if(loginStatus != "-1"){
				url = otp.config.hostname + '/otp/routers/' + loginStatus + '/gtfs/service/add';
			}
			var id = $('#'+this_.id+'-serviceId').val();
			var sun; $('#'+this_.id+'-sun-checkbox').prop('checked') ? sun = 1: sun = 0;
			var mon; $('#'+this_.id+'-mon-checkbox').prop('checked') ? mon = 1: mon = 0;
			var tue; $('#'+this_.id+'-tue-checkbox').prop('checked') ? tue = 1: tue = 0;
			var wed; $('#'+this_.id+'-wed-checkbox').prop('checked') ? wed = 1: wed = 0;
			var thu; $('#'+this_.id+'-thu-checkbox').prop('checked') ? thu = 1: thu = 0;
			var fri; $('#'+this_.id+'-fri-checkbox').prop('checked') ? fri = 1: fri = 0;
			var sat; $('#'+this_.id+'-sat-checkbox').prop('checked') ? sat = 1: sat = 0;		
			var start = (this_.startdate != null) ? this_.startdate : moment().format(otp.config.locale.time.date_format);
			var end = (this_.enddate != null) ? this_.enddate : moment().format(otp.config.locale.time.date_format);
			
			//add data related to the exceptions
			var include = [], exclude = [];	
			var tempInclude = $('#otp-gtfs-serviceEditor-adderWidget-includedDates div');
			for(var j=0; j < tempInclude.length; j++){
				var date = $(tempInclude[j]).children('input[type="text"]').val();
				include.push(date);
			}
			var tempExclude = $('#otp-gtfs-serviceEditor-adderWidget-excludedDates div');
			console.log(tempExclude.length);
			for(var j=0; j < tempExclude.length; j++){
				var date = $(tempExclude[j]).children('input[type="text"]').val();
				exclude.push(date);
			}

			var login = this_.control.gtfsEditor.owner.checkLoginStatus();
			$.ajax(url, {
				type: 'POST',
				data: JSON.stringify({
					'id': id,
					'sun': sun,
					'mon': mon,
					'tue': tue,
					'wed': wed,
					'thu': thu,
					'fri': fri,
					'sat': sat,
					'startdate': start,
					'enddate': end,
					'username': login,
					'include': include,
					'exclude': exclude,
				}),
				dataType: 'JSON',
				contentType: "application/json",
				
				beforeSend: function(){
					if(id == ''){
						otp.widgets.Dialogs.showOkDialog("Please select service Id", "Error");
						return false;
					}
					if(id.includes('_') || id.includes(':') || id.includes(';')){
						otp.widgets.Dialogs.showOkDialog("Service ID can't contain '_', ':', ';'", "Error");
						return false;
					}
					
					for(var i=0; i < this_.services.length; i++){
						if(id.toUpperCase() == this_.services[i].serviceId.split(":")[1].toUpperCase()){
							otp.widgets.Dialogs.showOkDialog("Service already exists", "Error");
							return false;
						}
					}
					
					var hasPeriodic = false;
					var checkboxes = $('#otp-gtfs-serviceEditor-adderWidget-table input[type="checkbox"]');
					for(var i=0; i < checkboxes.length; i++){
			        	if($(checkboxes[i]).prop("checked")){
			        		hasPeriodic = true;
			        		break;
			        	}			        	
					}
					console.log(hasPeriodic);
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
						console.log(include);
						if(include.length == 0){
							otp.widgets.Dialogs.showOkDialog("Please enter calendar data", "Error");
							return false;
						}
					}
				},
				
				success: function(val){
					switch (val){
						case 0:
							otp.widgets.Dialogs.showOkDialog("New service added", "GTFS updated");
							var feedId = this_.services[0].serviceId.split(':')[0];
							var service = {
								'id': feedId + ':' + id,
								'sun': sun,
								'mon': mon,
								'tue': tue,
								'wed': wed,
								'thu': thu,
								'fri': fri,
								'sat': sat,
								'startdate': start,
								'enddate': end,
								'include': include,
								'exclude': exclude,
							}
							this_.control.setService(service);
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
        	$('#'+this_.id+'-serviceId').val('');
			$('#'+this_.id+'-sun-checkbox').removeProp('checked');
        	$('#'+this_.id+'-mon-checkbox').removeProp('checked');
			$('#'+this_.id+'-tue-checkbox').removeProp('checked');
			$('#'+this_.id+'-wed-checkbox').removeProp('checked');
			$('#'+this_.id+'-thu-checkbox').removeProp('checked');
			$('#'+this_.id+'-fri-checkbox').removeProp('checked');
			$('#'+this_.id+'-sat-checkbox').removeProp('checked');
			$('#'+this_.id+'-startdate').datepicker('setDate', new Date());
			$('#'+this_.id+'-enddate').datepicker('setDate', new Date());
			$('#' + this_.id + '-includedDates div').each(function(){$(this).remove()});
            $('#' + this_.id + '-excludedDates div').each(function(){$(this).remove()});
            this_.index = 0;
            for(var i=0; i<7; i++)
            	this_.counter[i] = 0;
        });
    },
    
    checkExceptionDate: function(date, separator, type, element){
    	var data = date.split(separator);
    	var temp = new Date();
    	temp.setFullYear(data[2], data[0]-1, data[1]);
    	var day = temp.getDay();
    	console.log(day);
    	
    	//check if the exception date is already included/excluded from weekly periodic calendar 
    	if($($('#otp-gtfs-serviceEditor-adderWidget-table input[type="checkbox"]')[day]).prop('checked') && type=='include'){
    		otp.widgets.Dialogs.showOkDialog("The date is already included", "Error");
    		return false;
    	}
    	else if(!$($('#otp-gtfs-serviceEditor-adderWidget-table input[type="checkbox"]')[day]).prop('checked') && type=='exclude'){
    		otp.widgets.Dialogs.showOkDialog("The date is not included", "Error");
			return false;
    	}
    	
    	//avoid adding duplicated dates
    	var previous = $(element).parent().siblings();
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
    
    clear: function(){
    	this.close();
    },
})
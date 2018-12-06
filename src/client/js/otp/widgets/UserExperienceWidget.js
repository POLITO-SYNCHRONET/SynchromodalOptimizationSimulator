/**
 * Yuanyuan (06/07/2017)
 * User Experience Form
 */

otp.namespace("otp.widgets");

otp.widgets.userExperienceWidget = 
	otp.Class(otp.widgets.Widget, {
		
		title: "User Experience",
		id: null,
		stops: [],
		webapp: null,
		
		initialize : function(id, owner, options) {
			this.webapp = owner;
			this.id = id;
			
			var defaultOptions = {
				cssClass : 'otp-defaultInfoWidget',
				closeable : true,
				minimizable : true,
				openInitially : false,
			};
			
			options = (typeof options != 'undefined') ?
					_.extend(defaultOptions, options) : defaultOptions;
					
			otp.widgets.Widget.prototype.initialize.call(this, id, owner, options);
			

		    var content = $('<div style="margin-top:20px"></div>');
		    ich['otp-userExperience']({
		    	slocation: "starting location",
				elocation: "ending location",
				type: "type",
				dateTime: "dateTime",
				incidentPlace: "incident place",
				serviceProvider: "service provider",
				transportation: "transportation",
				reason: "incident reason",
				summary: "summary",
	            // to do: Add more fields
	            save: "Save",
	            widgetID: this.id
		    }).appendTo(content);
		     
		    this.setContent(content);
		    this.center(); 
		    
		    
		},
		
		doAfterLayout : function(){
		  var this_ = this;
		// get the stops 
		 // $('<option selected disabled>Select starting location</option>').appendTo($('#' + this_.id + '-slocation'));
		  var url = otp.config.hostname + '/' + otp.config.restService + '/index/stops';
		  // console.log(url);
		  $.ajax(url,{
			  
			  type: 'GET',
			  success: function(data) { 
	        	this_.stops = data;
			  
	        	for(var i=0; i < this_.stops.length; i++){
	        		// $('<option>' + this_.stops[i].name + '</option>').appendTo($('#' + this.id + '-slocation'));
	        		// To prevent the case that there's blank space in the name not shown
	        		
	        		$('<option value=' + this_.stops[i].name + '>').appendTo($('#' + this_.id + '-slocation'));
	        		$('<option value=' + this_.stops[i].name + '>').appendTo($('#' + this_.id + '-elocation'));
	        	}
                             
		       /* $('#' + this_.id + '-slocation').change(function(){
	        		var index = this_.selectedIndex -1;
	        		var content = this_.stops[index];
	        		console.log(content.name);
	        		$('#' + this_.id + '-slocation').val(content.name);
	        	}); */
	        	$("input[name='slocation']").focusout(function() {
	        		var selected = $(this).val();
	        		$('#' + this_.id + '-slocation').val(selected);
	        	});
	        
	        	$("input[name='elocation']").focusout(function(){
	        		var selected = $(this).val();
	        		$('#' + this_.id + '-elocation').val(selected);
	        	});	
	        
	        	$('#' + this_.id + '-save').click(function(){
	        		var url = otp.config.hostname + '/' + otp.config.restService + '/userExperience/save';
	        		// get the values of selected check box about incident types
	        		var typeValues = (function() {
	        			var a = [];
	        			$("input.type:checkbox:checked").each(function() {
	        				a.push(this.value);
	        			});
	        			return a;
	        		})()
				    $.ajax(url, {
				    	type: 'POST',
				    	data: JSON.stringify({
				    		'slocation': $('#' + this_.id + '-slocation').val(),
				    		'elocation': $('#' + this_.id + '-elocation').val(),
				    		'type': typeValues,
				    		'dateTime': $('#' + this_.id + '-dateTime').val(),
				    		'incidentPlace': $("input[name=incidentPlace]:checked").val(),
				    		'serviceProvider': $('#' + this_.id + '-serviceProvider').val(),
				    		'transportation': $("input[name=transportation]:checked").val(),
				    		'reason': $('#' + this_.id + '-reason').val(),
				    		'summary': $('#' + this_.id + '-summary').val(),
						// 'type': $('#' + this_.id + '-type').val(),
				    	}),
				    	dataType: 'JSON',
				    	contentType: "application/json",
					
				    	beforeSend: function(data){
				    		if($('#' + this_.id + '-slocation').val() == "" || $('#' + this_.id + '-elocation').val() == "" || 
								$('#' + this_.id + '-dateTime').val() == "" || $('#' + this_.id + '-serviceProvider').val() == "" || 
								$('#' + this_.id + '-reason').val() == "" || $('#' + this_.id + '-summary').val() == ""){
				    			console.log($('#' + this_.id + '-slocation').val());
				    			otp.widgets.Dialogs.showOkDialog("You don't enter all the information", "Error");
				    			return false;
				    		} 
				    	},
					
				    	success: function(val){
				    		switch (val){
							case 0:
								otp.widgets.Dialogs.showOkDialog("Experience saved", "Record updated");
								this_.close();
								
								//TODO need to update the new list of routes/stops data on client according to the updated graph (e.g. tripViewer/stopViewer)
								
								
								break;
								
							case -1:
								otp.widgets.Dialogs.showOkDialog("Unexpected error", "Error");
								break;
				    		}
				    	},
				    });
	        	});
			  } // end success function
		  }); 
		  
		},
		
	})
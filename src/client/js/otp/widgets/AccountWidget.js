
//Shuai (24-03-2017)
//widget control for accounting

otp.namespace("otp.widgets");

otp.widgets.LoginWidget = 
	otp.Class(otp.widgets.Widget, {

	title: "Login",
	id: null,
	webapp: null,
	
	logged_in: false,
	
	test: true,
		
	initialize: function(id, owner, options){
		
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
	    ich['otp-login']({
			username: "Username",
            password: "Password",
            login: "Login",
            register: "Register",
            widgetID: this.id
	    }).appendTo(content);
	    
	    this.setContent(content);
	    this.center(); 
	},
	
	doAfterLayout: function(){
		
		var this_ = this;
		
		$('#'+ this.id + '-submit').click(function(){
			var username = $('#'+ this_.id + '-username');
			var password = $('#'+ this_.id + '-password');
			
			//login for test
			otp.widgets.Dialogs.showOkDialog("welcome " + username.val(), "Login Successful");
			$('#otp-login-button').fadeOut();
			this_.logged_in = true;
			
			var div = $("<li id='otp-username'><a href='#'>"+username.val()+"</a></li>").appendTo($('#main-menu ul'));
			var popup = new otp.widgets.UserPopupMenu(this_.webapp);
			div.click(function(){
				popup.show();
			});
			
			username.val('');
			password.val('');
			
			this_.close();
			
			//update data in gtfsEditor if gtfsEditor module is on
			for(var i=0; i < otp.config.modules.length; i++){
				if(otp.config.modules[i].id == 'gtfs'){
					var module = this_.owner.modules[i];
					console.log(module.activated);
					if(module.activated){
						//if activated, clean the panel and update the GTFS data for the user who logged in
						module.updateForUserChange();
					}
					else{
						//if not activated, do nothing. When activating, the module will get the corresponding data for user
					}
				}
			}
			
			
			//real login procedure
//			var url = otp.config.hostname + '/' + otp.config.restService + '/user/login';
//			$.ajax(url, {
//				type: 'POST',
//				data: JSON.stringify({
//					'username': username.val(),
//					'password': password.val()
//				}),
//				dataType: 'JSON',
//				contentType: "application/json",
//				
//				beforeSend: function(){
//					if(username.val() == "" || password == ""){
//						otp.widgets.Dialogs.showOkDialog("Please enter username and password", "Error");
//						return false;
//					}
//				},
//				
//				success: function(val){
//					switch (val){
//						case 0:
//							otp.widgets.Dialogs.showOkDialog("welcome " + username.val(), "Login Successful");
//							$('#otp-login-button').fadeOut();
//							this_.logged_in = true;
//							
//							var popup = new otp.widgets.UserPopupMenu(this_.webapp);
//							$("<li id='otp-username'><a href='#'>"+username.val()+"</a></li>").appendTo($('#main-menu ul')).click(function(){
//								popup.show();
//							});
//							
//							username.val('');
//							password.val('');							
//							
//							this_.close();
//							break;
//							
//						case -1:
//							otp.widgets.Dialogs.showOkDialog("Wrong username or password", "Authentication Error");
//							break;
//					}
//				}
//			});
		});
		
		$('#'+ this.id + '-register').click(function(){
			this_.close();
			this_.owner.registerWidget.show();
			this_.owner.registerWidget.bringToFront();
		});		
	}
});


otp.widgets.RegisterWidget = 
	otp.Class(otp.widgets.Widget, {
		
	title: "Register",
	id: null,
	owner: null,
		
	initialize: function(id, owner, options){
		
		this.owner = owner;
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
        ich['otp-register']({
			username: "Username",
            password: "Password",
            confirm: "Confirm",
            widgetID: this.id
        }).appendTo(content);
        
	    this.setContent(content);
	    this.center(); 
	},
	
	doAfterLayout: function(){
		
		var this_ = this;
		
		$('#'+ this.id + '-confirm').click(function(){
			var url = otp.config.hostname + '/' + otp.config.restService + '/user/register';
			$.ajax(url, {
				type: 'POST',
				data: JSON.stringify({
					'username': $('#' + this_.id + '-username').val(),
					'password': $('#' + this_.id + '-password').val()
				}),
				dataType: 'JSON',
				contentType: "application/json",
				
				beforeSend: function(){
					if($('#' + this_.id + '-username').val() == "" || $('#' + this_.id + '-password').val() == ""){
						otp.widgets.Dialogs.showOkDialog("Please enter username and password", "Error");
						return false;
					}
				},
				
				success: function(val){
					switch (val){
						case 0:
							otp.widgets.Dialogs.showOkDialog("Thank you for your registration", "Registration Successful");
							this_.close();
							break;
							
						case -1:
							otp.widgets.Dialogs.showOkDialog("Username is already in use", "Registration Error");
							break;
					}
				}
			});
		});
	}
})


otp.widgets.UserPopupMenu =
    otp.Class(otp.core.PopupMenu, {
    	
    webapp: null,
    userConfigurationWidget: null,
    	
    initialize: function(webapp, username, userrole){
    	var this_ = this;
    	this.webapp = webapp;
    	
        otp.core.PopupMenu.prototype.initialize.call(this);
        
        this.menu.css({'top': '40px', 'right': '50px', 'text-align': 'center'}).hide();
        
        this.userConfigurationWidget = new otp.widgets.userConfigurationWidget('otp-userConfigurationWidget', webapp, {'username': username, 'userrole': userrole});
        this.userConfigurationWidget.doAfterLayout();
        this.addItem("Configuration", function(){
        	this_.userConfigurationWidget.show();
        });
        
//        this.addItem("My booking", function(){
//        	//TODO check activeModule
//        	this_.webapp.activeModule.processMyBooking();
//        });
        
//        this.addItem("Bookmark", function(){
//        	this_.webapp.activeModule.processBookmark();
//        });
        
        //TODO in final version, there will be no accounting procedure in simulator
        if(username == null){
	        this.addItem("Log out", function(){
	        	$('#otp-username').remove();
	        	$('#otp-login-button').show();
	        	this_.webapp.loginWidget.logged_in = false;
	        	
	        	//update data in gtfsEditor if gtfsEditor module is on
				for(var i=0; i < otp.config.modules.length; i++){
					if(otp.config.modules[i].id == 'gtfs'){
						var module = this_.webapp.modules[i];
						console.log(module.activated);
						if(module.activated){
							//if activated, clean the panel and update the GTFS data for the user who logged in
							module.updateForUserChange();
						}
						else{
							//if not activated, do nothing. When activating, the module will get the corresponding data for user
						}
					}
				}
				
				if(this_.userConfigurationWidget){
					this_.userConfigurationWidget.$().remove();
					delete this_.userConfigurationWidget;

					$('#otp-planner-optionsWidget-routesConfigurationWidget-routesList').empty();
					$('#otp-planner-optionsWidget-routesConfigurationWidget-routesList').append($('<option selected disabled>Select routes configuration</option>'));
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-trainList').empty();
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-trainList').append($('<option selected disabled>Train</option>'));
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-truckList').empty();
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-truckList').append($('<option selected disabled>Truck</option>'));
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-shipList').empty();
					$('#otp-planner-optionsWidget-vehicleConfigurationWidget-shipList').append($('<option selected disabled>Ship</option>'));
					$('#otp-planner-optionsWidget-generalConfigurationWidget-generalList').empty();
					$('#otp-planner-optionsWidget-generalConfigurationWidget-generalList').append($('<option selected disabled>Select general configuration</option>'));
				}
	        });
        }
    },
    
    show: function(){
        this.suppressHide = true;
    	this.menu.show().appendTo('body');
    },
    
    addWidget : function(widget) {
//        this.widgets.push(widget);
//        this.webapp.widgetManager.addWidget(widget);
    },
});
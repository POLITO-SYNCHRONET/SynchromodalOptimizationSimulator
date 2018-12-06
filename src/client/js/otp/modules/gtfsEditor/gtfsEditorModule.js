/**
 *  Shuai (12-07-2017) GTFS Editor Module
 */

otp.namespace("otp.modules.gtfsEditor");


otp.modules.gtfsEditor.gtfsEditorModule = 
    otp.Class(otp.modules.planner.PlannerModule, {
    
    moduleName: "GTFS Editor",
    
    webapp: null,
    
    gtfsEditorWidget: null,
    editorControl: null,
    
    username: null,
    userrole: null,
    
    initialize : function(webapp, id, options) {
    	this.webapp = webapp;
    	otp.modules.planner.PlannerModule.prototype.initialize.apply(this, arguments);
        if('username' in options){
        	this.username = options['username'];
        	this.userrole = options['userrole'];
        }
    },

    activate : function() {
        if(this.activated) return;
    	console.log("activate gtfsEditor module!!");

        var this_ = this;
        
        otp.modules.planner.PlannerModule.prototype.activate.apply(this);

        // set up gtfs editor widget
        this.gtfsEditorWidget = new otp.widgets.gtfsEditor.gtfsEditorWidget('otp-' + this.id, this);
        
        this.gtfsEditorWidget.addSeparator();
        this.editorControl = new otp.widgets.gtfsEditor.control(this.gtfsEditorWidget);
        this.gtfsEditorWidget.addControl("control", this.editorControl, true);
        this.gtfsEditorWidget.addSeparator();
    },
    
    handleClick: function(event){
    	var this_ = this;
    	console.log(event.latlng.lat + ':' + event.latlng.lng);
    	
    	//operations called when adding new route or modify existing ones
    	for(var i=0; i < this.widgets.length; i++){
    		if(this.widgets[i].id == 'otp-gtfs-routeEditor-adderWidget' && this.widgets[i].isOpen){		
				console.log("route adder open");
				this.editorControl.routeEditor.addShape(event, this.widgets[i]);
				break;
    		}
    		if(this.widgets[i].id == 'otp-gtfs-routeEditor-shapeWidget' && this.widgets[i].isOpen){	
    			console.log("shape widget open");
				this.editorControl.routeEditor.addShape(event, this.widgets[i]);				
				break;
    		}
    	}
    },
    
    //TODO discard else clause in the future
    checkLoginStatus: function(){
    	if(this.username != null)
    		return this.username;
    	else{
	    	if(this.webapp.loginWidget.logged_in == false)
	    		return -1;
	    	else
	    		return $('#otp-username :first-child').html();
    	}
    },
    
    updateForUserChange: function(){
    	var this_ = this;
    	var user = this.checkLoginStatus() == "-1" ? "default" : this.checkLoginStatus();
    	console.log(user);
    	
		//1. clean panel and map
		this.editorControl.stopEditor.clear();
		this.editorControl.routeEditor.clear();
		this.editorControl.serviceEditor.clear();
		
		//2. retrieve data
		var url = otp.config.hostname + '/otp/routers/' + user + '/index/stops';
		$.ajax(url,{
            success: function(data) {
            	console.log(data);
            	this_.editorControl.stopEditor.resetStops(data);
            	this_.editorControl.stopEditor.restore();
            },
		});
		
		var url = otp.config.hostname + '/otp/routers/' + user + '/index/routes';
		$.ajax(url,{
            success: function(data) {
            	console.log(data);
            	this_.editorControl.routeEditor.resetRoutes(data);
            },
		});
		
		var url = otp.config.hostname + '/otp/routers/' + user + '/index/services';
		$.ajax(url,{
            success: function(data) {
            	console.log(data);
            	
            	var url2 = otp.config.hostname + '/otp/routers/' + user + '/index/calendarDates';
        		$.ajax(url2,{
        			success: function(data2) {
        				console.log(data2);
        				this_.editorControl.serviceEditor.resetServices(data, data2);
        			}
        		});            	
            },
		});
    },
})
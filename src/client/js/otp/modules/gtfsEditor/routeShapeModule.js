/**
 * Shuai (05-12-2017) ship route shape Module
 */

otp.namespace("otp.modules.gtfsEditor");


otp.modules.gtfsEditor.routeShapeModule = 
    otp.Class(otp.modules.planner.PlannerModule, {
    
    moduleName: "Route Shape",
        
    webapp: null,
    
    routeShapeWidget: null,
    editorControl: null,
    
    initialize : function(webapp, id, options) {
    	this.webapp = webapp;
    	otp.modules.planner.PlannerModule.prototype.initialize.apply(this, arguments);
    },

    activate : function() {
        if(this.activated) return;
    	console.log("activate route shape module!!");

        var this_ = this;
        
        otp.modules.planner.PlannerModule.prototype.activate.apply(this);
        
        this.routeShapeWidget = new otp.widgets.gtfsEditor.routeShapeWidget('otp-' + this.id, this);
        
        this.routeShapeWidget.addSeparator();
        this.editorControl = new otp.widgets.gtfsEditor.routeShapeControl(this.routeShapeWidget);
        this.routeShapeWidget.addControl("control", this.editorControl, true);
        this.routeShapeWidget.addSeparator();
    },
})

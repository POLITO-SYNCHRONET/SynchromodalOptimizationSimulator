/**
 * Shuai (05-12-2017)
 * route shape widget
 */

otp.namespace("otp.widgets.gtfsEditor");

otp.widgets.gtfsEditor.routeShapeWidget = 
	otp.Class(otp.widgets.Widget, {
		
	title: "Route Shape",
	id: null,
	module: null,
	
	controls : null,
	scrollPanel : null,
	 
	initialize : function(id, owner, options) {
	
		this.module = owner;
		this.id = id;
		
	    var defaultOptions = {
	    	cssClass : 'otp-defaultRouteShapeWidget',
            closeable : true,
            minimizable : true,
            persistOnClose: true,
	    };
	    
	    options = (typeof options != 'undefined') ? 
	        _.extend(defaultOptions, options) : defaultOptions;
	        
	    otp.widgets.Widget.prototype.initialize.call(this, id, owner, options);
	    this.mainDiv.addClass('otp-RouteShapeWidget');
	    
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
	
	CLASS_NAME : "otp.widgets.routeShape"
});


//control class
otp.widgets.gtfsEditor.routeShapeWidgetControl = otp.Class({
   
	div :   null,
	routeShape : null,

    initialize : function(routeShape) {
        this.routeShape = routeShape;
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


otp.widgets.gtfsEditor.routeShapeControl = 
	otp.Class(otp.widgets.gtfsEditor.routeShapeWidgetControl, {
	
	id : null,

	controlPadding: '8px',
	
	shapes: [],
	
	markers: [],
	polyline: null,
	
	initialize : function(routeShape) {
    	var this_ = this;
    	otp.widgets.gtfsEditor.routeShapeWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = routeShape.id + "-editorControl";
        
		var html = "<div>test of the route shapes<div>";
		html += "<select id=" + this.id + "-routeList><option selected disabled>select route</option></select>";
		this.$().append($(html));
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		var url = otp.config.hostname + '/' + otp.config.restService + '/gtfs/routeShapeTest';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				for(var i=0; i < data.length; i++){
					$('<option>' + data[i].name + '</option>').appendTo($('#' + this_.id + '-routeList'));
					var points = otp.util.Geo.decodePolyline(data[i].coordinate.points);
					console.log(points);
					var content = {
						'id': data[i],
						'points': points,
					};
					this_.shapes.push(content);
				}
				console.log(this_.shapes);
				
				$('#' + this_.id + '-routeList').change(function(){
					var index = this.selectedIndex -1;
            		var content = this_.shapes[index];
            		
            		this_.routeShape.owner.webapp.map.lmap.panTo(content.points[0]);
            		this_.drawRoute(content.points);
				});
			},
		});		
	},
	
	drawRoute: function(points){
		var this_ = this;
		
		this.clearMap();
		this.polyline = new L.Polyline(points);
		this.routeShape.owner.pathLayer.addLayer(this.polyline);
		
		for(var i=0; i < points.length; i++){
			if(i == 0)
				var marker = new L.Marker(points[i], {icon: this.routeShape.owner.icons.startFlag, draggable: false});
			else if(i == points.length-1)
				var marker = new L.Marker(points[i], {icon: this.routeShape.owner.icons.endFlag, draggable: false});
			else
				var marker = new L.Marker(points[i], {icon: this.routeShape.owner.icons.large0, draggable: true});
			this.routeShape.owner.markerLayer.addLayer(marker);
			this.markers.push(marker);
		}
	},
	
	clearMap: function(){
		console.log('clear map');
		if(this.routeShape.owner.pathLayer.hasLayer(this.polyline))
			this.routeShape.owner.pathLayer.removeLayer(this.polyline);
		if(this.polyline != null)
			this.polyline == null;
		for(var i=0; i < this.markers.length; i++)
			if(this.routeShape.owner.markerLayer.hasLayer(this.markers[i]))
				this.routeShape.owner.markerLayer.removeLayer(this.markers[i]);
		this.markers = [];
	},
})

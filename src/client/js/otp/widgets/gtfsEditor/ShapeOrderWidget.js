/**
 * Shuai (12-07-2017) define the shape of the route
 */

otp.namespace("otp.widgets");


otp.widgets.ShapeOrderWidget =
    otp.Class(otp.widgets.Widget, {
    
    id: null,
    control: null,
    routes: [],
    	
    initialize : function(id, control, name) {
    	var this_ = this;
    	this.id = id;
        this.control = control;
        
        otp.widgets.Widget.prototype.initialize.call(this, id, control.control.gtfsEditor.owner, {
            openInitially : false,
            title : name
        });
        
        ich['otp-gtfsEditor-routeEditor-shapeDrawer']({
        	order: _tr('Order'),
        	latitude: _tr('Latitude'),
        	longitude: _tr('Longitude'),
        	note: _tr('Note'),
        	del: _tr('Delete'),
        	close: _tr("close"),
            widgetID: this.id
	    }).appendTo(this.$()); 
        
	    this.$().css({
	    	'overflow-y': 'hidden',
	    });
        
        $('#' + this.id + '-close').click(function(){
        	this_.close();
        });
        
        $('#' + this.id + '-table tbody').sortable({
        	cursor: "move",
        	start: function(event, ui){
        		console.log(ui.item.index());
        		console.log(this_.control.markers);
        		ui.item.data('before', ui.item.index());
        	},
        	update: function(event, ui){
        		console.log(ui.item.index());
        		console.log(this_.control.markers);
        		this_.control.reorderRoute(ui.item.data('before'), ui.item.index());
        	},
        });
    },
    
    setPointList: function(points){
    	var this_ = this;
    	
    	//delayed input
        var delay = (function(){
        	var timer = 0;
        	return function(callback, ms){
        		clearTimeout(timer);
        		timer = setTimeout(callback, ms)
        	}
        })();   
    	
    	for(var i=0; i < points.length; i++){    		
    		var html = '<tr id="' + this.id + '-tableRow' + (i+1) +'">';
    		html += '<td>' + (i+1) + '</td>';
    		html += '<td><input id="' + this.id + '-LatInput' + (i+1) +'" value="' + points[i].lat + '" class="notDraggable"/></td>';
    		html += '<td><input id="' + this.id + '-LonInput' + (i+1) +'" value="' + points[i].lng + '" class="notDraggable"/></td>';
    		if(i == 0){
    			html += '<td>Departure</td>';
    			html += '<td></td>';
    		}
    		else if(i == points.length-1){
    			html += '<td>Arrival</td>';
    			html += '<td></td>';
    		}
    		else{
    			html += '<td>...</td>';
    			html += '<td><img src="images/cross.png"></td>';
    			html += '</tr>';
    		}
    		$(html).appendTo($('#' + this.id + '-table tbody')); 
    		
    		$('#' + this.id + '-table').parent().css({
    			'overflow-y': 'scroll',
    			'max-height': '700px'
    		});
    		
    		if(i!=0 && i!=points.length-1){
	    		$('#' + this.id + '-table tbody').children(':last').find('img').click({object: $('#' + this.id + '-table tbody').children(':last')}, function(event){
	    			var position = event.data.object.find('td').eq(0).text();
	    			this_.control.points.splice(position-1, 1);
	    			
	    			event.data.object.remove();    			
	    			this_.updateTableIndex();	    	
	    			this_.control.drawRoute();
	    		});
	    		
	    		$('#' + this.id + '-LatInput' + (i+1)).keyup(function(){
	    			var thisInput = this;
	    			var index = $(this)[0].id.slice(-1);
	    			console.log(index);
	    			delay(function(){
	    	        	var lng = $('#' + this_.id + '-LonInput' + index).val();
	    	        	if($.isNumeric(lng) && $.isNumeric($(thisInput).val())){
	    	        		var latlng = new L.LatLng($(thisInput).val(), lng);
	    	        		this_.control.markers[index-1].setLatLng(latlng);
	    	        		this_.control.resetRoute();
	    	        	}
	            	}, 1000);
	    		});
	    		$('#' + this.id + '-LonInput' + (i+1)).keyup(function(){
	            	var thisInput = this;
	            	var index = $(this)[0].id.slice(-1);
	    			console.log(index);
	            	delay(function(){
	    	        	var lat = $('#' + this_.id + '-LatInput' + index).val();
	    	        	if($.isNumeric(lat) && $.isNumeric($(thisInput).val())){
	    		        	var latlng = new L.LatLng($('#' + this_.id + '-LatInput' + index).val(), $(thisInput).val());
	    	        		this_.control.markers[index-1].setLatLng(latlng);
	    	        		this_.control.resetRoute();
	    	        	}
	            	}, 1000);
	            });
    		}    		
    	}
    },
    
    updatePointList: function(points){
    	var this_ = this;   	
    	var tr = $('#' + this.id + '-table tbody').children();
    	for(var i=0; i < tr.length; i++){
    		$(tr[i]).children().eq(1).children().eq(0).val(points[i].lat);
    		$(tr[i]).children().eq(2).children().eq(0).val(points[i].lng);
    	}
    },
    
    updateTableIndex: function(){
      	var length = $('#' + this.id + '-table tbody').children().length;
    	for(var i=0; i < length; i++){
    		$('#' + this.id + '-table tbody').children().eq(i).find('td').eq(0).text(i+1);
    	}
    },
    
    cleanTable: function(){
    	$('#' + this.id + '-table tbody').children().each(function(){
    		this.remove();
    	});
    },
    
    clear: function(){
    	this.close();
    	this.cleanTable();
    },
})
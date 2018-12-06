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

otp.namespace("otp.widgets.tripoptions");

otp.widgets.tripoptions.TripOptionsWidget =
    otp.Class(otp.widgets.Widget, {

    //planTripCallback : null,
    controls : null,
    module : null,

    scrollPanel : null,

    autoPlan : false,

    initialize : function(id, module, options) {

        options = options || {};
        //TRANSLATORS: Widget title
        if(!_.has(options, 'title')) options['title'] = _tr("Travel Options");
        if(!_.has(options, 'cssClass')) options['cssClass'] = 'otp-defaultTripWidget';
        otp.widgets.Widget.prototype.initialize.call(this, id, module, options);

        this.mainDiv.addClass('otp-tripOptionsWidget');

        //this.planTripCallback = planTripCallback;
        this.module = module;

        this.controls = {};
        
        this.$().css("max-height", $(window).height()*0.8);
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
        this.scrollPanel = $('<div id="'+this.id+'-scollPanel" class="notDraggable" style="overflow: auto;max-height:' + $(window).height()*0.7 + 'px"></div>').appendTo(this.$());
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

    restorePlan : function(data) {
	    if(data == null) return;
	    console.log('restore plan in trip options widget');
	    for(var id in this.controls) {
            this.controls[id].restorePlan(data);
        }
    },

    applyQueryParams : function(queryParams) {
        this.restorePlan({ queryParams : queryParams });
    },

    restoreDefaults : function(useCurrentTime) {
        var params = _.clone(this.module.defaultQueryParams);
        if(useCurrentTime) {
            params['date'] = moment().format(otp.config.locale.time.date_format);
            params['time'] = moment().format(otp.config.locale.time.time_format);
        }
        this.applyQueryParams(params);
    },

    newItinerary : function(itin) {
        for(var id in this.controls) {
            this.controls[id].newItinerary(itin);
        }
    },

    inputChanged : function(params) {
        if(params) _.extend(this.module, params);
        if(this.autoPlan) {
            this.module.planTrip();
        }
    },


    CLASS_NAME : "otp.widgets.TripWidget"
});


//** CONTROL CLASSES **//

otp.widgets.tripoptions.TripOptionsWidgetControl = otp.Class({

    div :   null,
    tripWidget : null,

    initialize : function(tripWidget) {
        this.tripWidget = tripWidget;
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

    newItinerary : function(itin) {
    },

    isApplicableForMode : function(mode) {
        return false;
    },

    $ : function() {
        return $(this.div);
    }
});

//** LocationsSelector **//

otp.widgets.tripoptions.LocationsSelector =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    geocoders    :  null,

    activeIndex  :  0,

    initialize : function(tripWidget, geocoders) {
        console.log("init loc");
        this.geocoders = geocoders;

        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-locSelector";

        ich['otp-tripOptions-locations']({
            widgetId : this.id,
            showGeocoders : (this.geocoders && this.geocoders.length > 1),
            geocoders : this.geocoders,
            //TODO: Maybe change to Start and Destination
            start: pgettext('template', "Start"),
            end: _tr("End"),
            geocoder: _tr("Geocoder")
        }).appendTo(this.$());

        this.tripWidget.module.on("startChanged", $.proxy(function(latlng, name) {
            $("#"+this.id+"-start").val(name || '(' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')');
        }, this));

        this.tripWidget.module.on("endChanged", $.proxy(function(latlng, name) {
            $("#"+this.id+"-end").val(name || '(' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')');
        }, this));

    },

    doAfterLayout : function() {
        var this_ = this;

        this.startInput = this.initInput($("#"+this.id+"-start"), this.tripWidget.module.setStartPoint);
        this.endInput = this.initInput($("#"+this.id+"-end"), this.tripWidget.module.setEndPoint);


        $("#"+this.id+"-startDropdown").click($.proxy(function() {
            $("#"+this.id+"-start").autocomplete("widget").show();
        }, this));

        $("#"+this.id+"-endDropdown").click($.proxy(function() {
            $("#"+this.id+"-end").autocomplete("widget").show();
        }, this));


        $("#"+this.id+"-reverseButton").click($.proxy(function() {
            var module = this.tripWidget.module;
            var startLatLng = module.startLatLng, startName = module.startName;
            var endLatLng = module.endLatLng, endName = module.endName;
            module.clearTrip();
            module.setStartPoint(endLatLng, false, endName);
            module.setEndPoint(startLatLng, false, startName);
            this_.tripWidget.inputChanged();

        }, this));

        if(this.geocoders.length > 1) {
            var selector = $("#"+this.id+"-selector");
            selector.change(function() {
                this_.activeIndex = this.selectedIndex;
            });
        }
    },

    initInput : function(input, setterFunction) {
        var this_ = this;
        input.autocomplete({
            delay: 500, // 500ms between requests.
            source: function(request, response) {
                this_.geocoders[this_.activeIndex].geocode(request.term, function(results) {
                    console.log("got results "+results.length);
                    response.call(this, _.pluck(results, 'description'));
                    input.data("results", this_.getResultLookup(results));
                });
            },
            select: function(event, ui) {
                var result = input.data("results")[ui.item.value];
                var latlng = new L.LatLng(result.lat, result.lng);
                this_.tripWidget.module.webapp.map.lmap.panTo(latlng);//PHUONG: pan the map back to the last location whenever the button is clicked
                setterFunction.call(this_.tripWidget.module, latlng, false, result.description);
                this_.tripWidget.inputChanged();
            },
        })
        .dblclick(function() {
            $(this).select();
        });
        return input;
    },

    getResultLookup : function(results) {
        var resultLookup = {};
        for(var i=0; i<results.length; i++) {
            resultLookup[results[i].description] = results[i];
        }
        return resultLookup;
    },

    restorePlan : function(data) {
        if(data.queryParams.fromPlace) {
            console.log("rP: "+data.queryParams.fromPlace);
            var fromName = otp.util.Itin.getLocationName(data.queryParams.fromPlace);
            if(fromName) {
                $("#"+this.id+"-start").val(fromName);
                this.tripWidget.module.startName = fromName;
            }
        }
        else {
            $("#"+this.id+"-start").val('');
            this.tripWidget.module.startName = null;
        }

        if(data.queryParams.toPlace) {
            var toName = otp.util.Itin.getLocationName(data.queryParams.toPlace);
            if(toName) {
                $("#"+this.id+"-end").val(toName);
                this.tripWidget.module.endName = toName;
            }
        }
        else {
            $("#"+this.id+"-end").val('');
            this.tripWidget.module.endName = null;
        }
    }

});


//** TimeSelector **//
otp.widgets.tripoptions.TimeSelector =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id          :  null,
	label        : _tr("Depart not earlier than:"),
    epoch       : null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-timeSelector";

        ich['otp-tripOptions-timeSelector']({
            widgetId : this.id,
            label : this.label,
            now      : _tr("Now")
        }).appendTo(this.$());

        this.epoch = moment().unix();
    },

    doAfterLayout : function() {
        var this_ = this;

		this_.tripWidget.module.arriveBy = false;

        $('#'+this.id+'-date').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(date) {
                this_.tripWidget.inputChanged({
                    date : date,
                });
            }
        });
        $('#'+this.id+'-date').datepicker("setDate", new Date());

        $('#'+this.id+'-time').val(moment().format(otp.config.locale.time.time_format))
        .keyup(function() {
            if(otp.config.locale.time.time_format.toLowerCase().charAt(otp.config.locale.time.time_format.length-1) === 'a') {
                var val = $(this).val().toLowerCase();
                if(val.charAt(val.length-1) === 'm') {
                    val = val.substring(0, val.length-1);
                }
                if(val.charAt(val.length-1) === 'a' || val.charAt(val.length-1) === 'p') {
                    if(otp.util.Text.isNumber(val.substring(0, val.length-1))) {
                        var num = parseInt(val.substring(0, val.length-1));
                        if(num >= 1 && num <= 12) $(this).val(num + ":00" + val.charAt(val.length-1) + "m");
                        else if(num >= 100) {
                            var hour = Math.floor(num/100), min = num % 100;
                            if(hour >= 1 && hour <= 12 && min >= 0 && min < 60) {
                                $(this).val(hour + ":" + (min < 10 ? "0" : "") + min + val.charAt(val.length-1) + "m");
                            }
                        }
                    }
                }
            }
            this_.tripWidget.inputChanged({
                time : $(this).val(),
            });

        });

        $("#"+this.id+'-nowButton').click(function() {
            $('#'+this_.id+'-date').datepicker("setDate", new Date());
            $('#'+this_.id+'-time').val(moment().format(otp.config.locale.time.time_format))
            this_.tripWidget.inputChanged({
                time : $('#'+this_.id+'-time').val(),
                date : $('#'+this_.id+'-date').val()
            });
        });

    },

    getDate : function() {
        return $('#'+this.id+'-date').val();
    },

    getTime : function() {
        return $('#'+this.id+'-time').val();
    },

    restorePlan : function(data) {
        //var m = moment(data.queryParams.date+" "+data.queryParams.time, "MM-DD-YYYY h:mma");
        //$('#'+this.id+'-picker').datepicker("setDate", new Date(m));
        if(data.queryParams.date) {
            $('#'+this.id+'-date').datepicker("setDate", new Date(moment(data.queryParams.date, otp.config.locale.time.date_format)));
            this.tripWidget.module.date = data.queryParams.date;
        }
        if(data.queryParams.time) {
            $('#'+this.id+'-time').val(moment(data.queryParams.time, otp.config.locale.time.time_format).format(otp.config.locale.time.time_format));
            this.tripWidget.module.time = data.queryParams.time;
        }
		this.tripWidget.module.arriveBy = false;
        /*if(data.queryParams.arriveBy === true || data.queryParams.arriveBy === "true") {
            this.tripWidget.module.arriveBy = true;
            $('#'+this.id+'-depArr option:eq(1)').prop('selected', true);
        }
        else {
            this.tripWidget.module.arriveBy = false;
            $('#'+this.id+'-depArr option:eq(0)').prop('selected', true);
        }*/
    }

});

//** TimeSelectorArrive **//

otp.widgets.tripoptions.TimeSelectorArrive =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id          :  null,
	label        : _tr("Arrive not later than		:"),
    epoch       : null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-timeSelectorArrive";

        this.$().css({
        	'overflow-y': 'auto',
        	'max-height': '100px'
        });
        
        ich['otp-tripOptions-timeSelectorArrive']({
            widgetId : this.id,
			label : this.label,
        }).appendTo(this.$());

        this.epoch = moment().unix();
    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this_.id+'-dateArrive').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(dateArrive) {
                this_.tripWidget.inputChanged({
                    dateArrive : dateArrive,
                });
            }
        });
        $('#'+this.id+'-dateArrive').datepicker('disable');
		
		$("#"+this.id+"-timeArrive-checkbox").change(function() {
			this_.tripWidget.module.timeArriveVisible = this.checked;
			if(this.checked){
				$('#'+this_.id+'-timeArrive').removeAttr('readonly').css('background', 'white');
				$('#'+this_.id+'-dateArrive').removeAttr('readonly').css('background', 'white');
				$('#'+this_.id+'-dateArrive').datepicker('enable');
			}
			else{
				$('#'+this_.id+'-timeArrive').attr('readonly', 'true').css('background', '#CCCCCC');
				$('#'+this_.id+'-dateArrive').attr('readonly', 'true').css('background', '#CCCCCC');
				$('#'+this_.id+'-dateArrive').datepicker('disable');
			}
		});
        
		$('#'+this.id+'-dateArrive').datepicker("setDate", new Date());

        $('#'+this.id+'-timeArrive').val(moment().format(otp.config.locale.time.time_format))
        .keyup(function() {
            if(otp.config.locale.time.time_format.toLowerCase().charAt(otp.config.locale.time.time_format.length-1) === 'a') {
                var val = $(this).val().toLowerCase();
                if(val.charAt(val.length-1) === 'm') {
                    val = val.substring(0, val.length-1);
                }
                if(val.charAt(val.length-1) === 'a' || val.charAt(val.length-1) === 'p') {
                    if(otp.util.Text.isNumber(val.substring(0, val.length-1))) {
                        var num = parseInt(val.substring(0, val.length-1));
                        if(num >= 1 && num <= 12) $(this).val(num + ":00" + val.charAt(val.length-1) + "m");
                        else if(num >= 100) {
                            var hour = Math.floor(num/100), min = num % 100;
                            if(hour >= 1 && hour <= 12 && min >= 0 && min < 60) {
                                $(this).val(hour + ":" + (min < 10 ? "0" : "") + min + val.charAt(val.length-1) + "m");
                            }
                        }
                    }
                }
            }
            this_.tripWidget.inputChanged({
                timeArrive : $(this).val(),
            });

        });

        /*$("#"+this.id+'-nowButton1').click(function() {
            $('#'+this_.id+'-dateArrive').datepicker("setDate", new Date());
            $('#'+this_.id+'-timeArrive').val(moment().format(otp.config.locale.time.time_format))
            this_.tripWidget.inputChanged({
                timeArrive : $('#'+this_.id+'-timeArrive').val(),
                dateArrive : $('#'+this_.id+'-dateArrive').val()
            });
        });*/

    },
    
    //Shuai (09-06-2017)
    addSelector : function(index){
    	var this_ = this;
    	var newId = this.id + index;
    	var newLabel = _tr('End ' + index + ' Arrive not later than		:');
    
		ich['otp-tripOptions-timeSelectorArrive']({
            widgetId : newId,
			label : newLabel,
        }).appendTo(this.$());
		
		this_.tripWidget.module.otherDateArrive[index-2] = moment().format("MM-DD-YYYY");
		this_.tripWidget.module.otherTimeArrive[index-2] = moment().format("h:mma");
		this_.tripWidget.module.otherTimeArriveVisible[index-2] = false;
        
		$('#'+newId+'-dateArrive').data('id', index);
        $('#'+newId+'-dateArrive').datepicker({
            timeFormat: otp.config.locale.time.time_format_picker,
            onSelect: function(dateArrive) {
                var id = $(this).data('id');
                console.log(this_.tripWidget.module.otherDateArrive);
                this_.tripWidget.module.otherDateArrive[id-2] = dateArrive;
                console.log(this_.tripWidget.module.otherDateArrive);
            }
        });
        $('#'+newId+'-dateArrive').datepicker('disable');
		
        $("#"+newId+"-timeArrive-checkbox").data('id', index);
		$("#"+newId+"-timeArrive-checkbox").change(function() {
			var id = $(this).data('id');
			console.log('newId: ' + index + '--> index: ' + id);
			
			console.log(this_.tripWidget.module.otherTimeArriveVisible);
			this_.tripWidget.module.otherTimeArriveVisible[id-2] = this.checked;
			console.log(this_.tripWidget.module.otherTimeArriveVisible);
			if(this.checked){
				$('#'+ this_.id + id+'-timeArrive').removeAttr('readonly').css('background', 'white');
				$('#'+ this_.id + id+'-dateArrive').removeAttr('readonly').css('background', 'white');
				$('#'+ this_.id + id+'-dateArrive').datepicker('enable');
			}
			else{
				$('#'+ this_.id + id+'-timeArrive').attr('readonly', 'true').css('background', '#CCCCCC');
				$('#'+ this_.id + id+'-dateArrive').attr('readonly', 'true').css('background', '#CCCCCC');
				$('#'+ this_.id + id+'-dateArrive').datepicker('disable');
			}
		});
        
		$('#'+newId+'-dateArrive').datepicker("setDate", new Date());

		$('#'+newId+'-timeArrive').data('id', index);
        $('#'+newId+'-timeArrive').val(moment().format(otp.config.locale.time.time_format))
        .keyup(function() {
        	var id = $(this).data('id');
            if(otp.config.locale.time.time_format.toLowerCase().charAt(otp.config.locale.time.time_format.length-1) === 'a') {
                var val = $(this).val().toLowerCase();
                if(val.charAt(val.length-1) === 'm') {
                    val = val.substring(0, val.length-1);
                }
                if(val.charAt(val.length-1) === 'a' || val.charAt(val.length-1) === 'p') {
                    if(otp.util.Text.isNumber(val.substring(0, val.length-1))) {
                        var num = parseInt(val.substring(0, val.length-1));
                        if(num >= 1 && num <= 12) $(this).val(num + ":00" + val.charAt(val.length-1) + "m");
                        else if(num >= 100) {
                            var hour = Math.floor(num/100), min = num % 100;
                            if(hour >= 1 && hour <= 12 && min >= 0 && min < 60) {
                                $(this).val(hour + ":" + (min < 10 ? "0" : "") + min + val.charAt(val.length-1) + "m");
                            }
                        }
                    }
                }
            }
            console.log(this_.tripWidget.module.otherTimeArrive);
            this_.tripWidget.module.otherTimeArrive[id-2] = $(this).val();
            console.log(this_.tripWidget.module.otherTimeArrive);
        });
    },
    
    removeSelector : function(index, total){
    	var this_ = this;
    	var removeId = this.id + index;
		
    	console.log($('#' + removeId + '-timeSelectorArrive'));
    	$('#' + removeId + '-timeSelectorArrive').remove();
    	
    	if(index == total){
    		this_.tripWidget.module.otherDateArrive.pop();
    		this_.tripWidget.module.otherTimeArrive.pop();
    		this_.tripWidget.module.otherTimeArriveVisible.pop();
    	}
    	else{
    		for(var i= index+1; i <= total; i++){
    			var label = $('#'+ this.id + i + '-timeSelectorArrive span').text().split(' ');
    			label[1] = label[1] - 1;
    			$('#'+ this.id + i + '-timeSelectorArrive span').text(label.join(' ')); 			
    			$('#'+ this.id + i + '-timeSelectorArrive').attr('id', '' + this.id + (i-1) + '-timeSelectorArrive');    			
    			
    			$('#'+ this.id + i +'-dateArrive').datepicker("destroy")/*.removeClass("hasDatepicker");*/
    			$('#'+ this.id + i +'-dateArrive').data('id', i-1).attr('id', '' + this.id + (i-1) + '-dateArrive');
    			$('#'+ this.id + (i-1) +'-dateArrive').datepicker({
    	            timeFormat: otp.config.locale.time.time_format_picker,
    	            onSelect: function(dateArrive) {
    	                var id = $(this).data('id');
    	                console.log(this_.tripWidget.module.otherDateArrive);
    	                this_.tripWidget.module.otherDateArrive[id-2] = dateArrive;
    	                console.log(this_.tripWidget.module.otherDateArrive);
    	            }
    	        });
    			$('#'+ this.id + i +'-timeArrive').data('id', i-1).attr('id', '' + this.id + (i-1) + '-timeArrive');
    			$("#"+ this.id + i +"-timeArrive-checkbox").data('id', i-1).attr('id', '' + this.id + (i-1) + '-timeArrive-checkbox');
			}
    		
    		this_.tripWidget.module.otherDateArrive.splice(index-2, 1);
    		this_.tripWidget.module.otherTimeArrive.splice(index-2, 1);
    		this_.tripWidget.module.otherTimeArriveVisible.splice(index-2, 1);
    	}
    },

    getDateArrive : function() {
        return $('#'+this.id+'-dateArrive').val();
    },

    getTimeArrive : function() {
        return $('#'+this.id+'-timeArrive').val();
    },

    restorePlan : function(data) {
        //var m = moment(data.queryParams.date+" "+data.queryParams.time, "MM-DD-YYYY h:mma");
        //$('#'+this.id+'-picker').datepicker("setDate", new Date(m));
        if(data.queryParams.dateArrive) {
            $('#'+this.id+'-dateArrive').datepicker("setDate", new Date(moment(data.queryParams.dateArrive, otp.config.locale.time.date_format)));
            this.tripWidget.module.dateArrive = data.queryParams.dateArrive;
        }
        if(data.queryParams.timeArrive) {
            $('#'+this.id+'-timeArrive').val(moment(data.queryParams.timeArrive, otp.config.locale.time.time_format).format(otp.config.locale.time.time_format));
            this.tripWidget.module.timeArrive = data.queryParams.timeArrive;
        }
		if(data.queryParams.timeArriveVisible) {
            $("#"+this.id+"-timeArrive-checkbox").prop("checked", data.queryParams.timeArriveVisible);
        }
    }

});


otp.widgets.tripoptions.slowSteaming =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id          :  null,
	label        : _tr("Slow Steaming		:"),
    epoch       : null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-slowSteaming";

        ich['otp-tripOptions-slowSteaming']({
            widgetId : this.id,
			label : this.label,
        }).appendTo(this.$());

        this.epoch = moment().unix();
    },

    doAfterLayout : function() {
        var this_ = this;

		$("#"+this.id+"-slowSteaming-checkbox").change(function() {
			this_.tripWidget.module.slowSteaming = this.checked;
		});
       

    },

    restorePlan : function(data) {
		if(data.queryParams.slowSteaming) {
            $("#"+this.id+"-slowSteaming-checkbox").prop("checked", data.queryParams.slowSteaming);
        }
    }

});


otp.widgets.tripoptions.KPIimportance =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

//Shuai (08-03-2017) remove the KPI checkbox.  
    	
//    id          :  null,
//	label        : _tr("Experiment with KPI importance		:"),
//    epoch       : null,
//
//    initialize : function(tripWidget) {
//        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
//        this.id = tripWidget.id+"-KPIimportance";
//
//        ich['otp-tripOptions-KPIimportance']({
//            widgetId : this.id,
//			label : this.label,
//        }).appendTo(this.$());
//
//        this.epoch = moment().unix();
//    },
//
//    doAfterLayout : function() {
//        var this_ = this;
//
//		$("#"+this.id+"-KPIimportance-checkbox").change(function() {
//			this_.tripWidget.module.KPIimportance = this.checked;
//		});
//       
//
//    },
//
//    restorePlan : function(data) {
//		if(data.queryParams.KPIimportance) {
//            $("#"+this.id+"-KPIimportance-checkbox").prop("checked", data.queryParams.KPIimportance);
//        }
//    }

});



//Shuai (05-05-2017) replace drop down selection with a set of checkboxes.
//** ModeSelector **//

otp.widgets.tripoptions.ModeSelector =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    modes        : otp.config.modes,

    optionLookup : null,
    modeControls : null,
    
    nMode : null,

    initialize : function(tripWidget) {
    	var this_ = this;
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-modeSelector";
        this.modeControls = [];
        this.optionLookup = {};

        //TRANSLATORS: Label for dropdown Travel by: [mode of transport]
//        var html = "<div class='notDraggable'>" + _tr("Travel by") + ": ";
//        html += '<select id="'+this.id+'">';
//        _.each(this.modes, function(text, key) {
//            html += '<option>'+text+'</option>';
//        });
//        html += '</select><hr/>';
        this.nMode = 0;
        
        var html = "<div class='notDraggable'><div style='float:left; height:30px; width:80px'>" + _tr("Travel by") + ": </div>";
        html += '<div id="' + this.id + '">';
        _.each(this.modes, function(text, key){ 
        	if(this_.nMode == 0)
        		html += '<div style="margin-left:5px;" id="' + this_.id + this_.nMode + '">' + text + '<input id="' + this_.id + '-checkbox' + this_.nMode + '" type="checkbox"/></div>';
        	else
        		html += '<div style="margin-left:5px; display:inline-block" id="' + this_.id + this_.nMode + '">' + text + '<input id="' + this_.id + '-checkbox' + this_.nMode + '" type="checkbox"/></div>';
        	this_.nMode += 1;
        });
        html += '</div><hr/>'
        html += '<div id="'+this.id+'-widgets" style="overflow: hidden;"></div>';
        html += "</div>";

        $(html).appendTo(this.$());
        //this.setContent(content);
    },

    doAfterLayout : function() {
        var this_ = this;
        
        var checkboxes = $('#' + this.id + ' :input');
        for(var i=0; i < checkboxes.length; i++){
        	var checkbox = checkboxes.eq(i);
        	checkbox.data('key', this.modes[i]);
        	if(i==0){
        		checkbox.prop('checked', true);
        	}
        	else{
        		checkbox.prop({
        			'checked': true,
        			'disabled': true
        		});
        	}
        }
        
        $('#' + this_.id + '-checkbox0').change(function(){
        	if(this.checked){
        		var checkboxes = $('#' + this_.id + ' :input');
    	        for(var i=1; i < checkboxes.length; i++){
    	        	var checkbox = checkboxes.eq(i);
    	        	checkbox.prop('disabled', true);
    	        	if(!checkbox.prop('checked'))
    	        		checkbox.prop('checked', true);
    	        }
    	        this_.tripWidget.inputChanged({
                	mode : _.keys(this_.modes)[0],
                });
                this_.refreshModeControls();
        	}
        	else{
        		var checkboxes = $('#' + this_.id + ' :input');
    	        for(var i=1; i < checkboxes.length; i++){
    	        	var checkbox = checkboxes.eq(i);
    	        	checkbox.removeProp('disabled');
    	        	if(checkbox.prop('checked'))
    	        		checkbox.removeProp('checked');
    	        }
    	        this_.tripWidget.inputChanged({
                	mode : null,
                });
                this_.refreshModeControls();
        	}
        });
        
        var checkboxes = $('#' + this_.id + ' :input');
        for(var i=1; i < checkboxes.length; i++){
        	var checkbox = checkboxes.eq(i);
        	checkbox.change(function(){
        		var checkboxes = $('#' + this_.id + ' :input');
        		if(this.checked){
        			var allChecked = true;
        			for(var j=1; j < checkboxes.length; j++){
        				if(!checkboxes.eq(j).prop('checked'))
        					allChecked = false;
        			}
        			if(allChecked){
        				$('#' + this_.id + '-checkbox0').prop('checked', true);
        				var checkboxes = $('#' + this_.id + ' :input');
            	        for(var k=1; k < checkboxes.length; k++){
            	        	var checkbox = checkboxes.eq(k);
            	        	checkbox.prop('disabled', true);
            	        }
            	        this_.tripWidget.inputChanged({
                        	mode : _.keys(this_.modes)[0],
                        });
                        this_.refreshModeControls();
                        return;
        			}
        		}
        		this_.prepareModeParam();
        		this_.refreshModeControls();
        	});
        }
    },
    
    prepareModeParam: function(){
    	var this_ = this;
    	var index = this.getCheckedBox();
    	if(index.length > 0){
    		var keys = '';
	    	for(var i=0; i < index.length; i++){
	    		keys += _.keys(this_.modes)[index[i]] + ((i < index.length-1) ? ',' : '');
	    	}
	        this_.tripWidget.inputChanged({
            	mode : keys
            });
    	}
    	else{
	        this_.tripWidget.inputChanged({
            	mode : null
            });
    	}
    },

    restorePlan : function(data) {
        var i = 0;
        for(mode in this.modes) {
            if(mode === data.queryParams.mode) {
                this.tripWidget.module.mode = data.queryParams.mode;
                $('#'+this.id+' option:eq('+i+')').prop('selected', true);
            }
            i++;
        }

        for(i = 0; i < this.modeControls.length; i++) {
            this.modeControls[i].restorePlan(data);
        }
    },

    controlPadding : "8px",
    
    getCheckedBox: function(){
    	var this_ = this;
    	if($('#' + this_.id + '-checkbox0').prop('checked')){
    		return 0;
    	}
    	else{
    		var modes = $('#' + this_.id + ' :input');
    		var index = [];
    		for(var i=1; i < modes.length; i++){
    			if(modes.eq(i).prop('checked')){
    				index.push(i);
    			}
    		}
    		return index;
    	}
    },

    refreshModeControls : function() {
        var container = $("#"+this.id+'-widgets');
        container.empty();
        var mode;
        if(this.getCheckedBox() == 0){
        	mode = _.keys(this.modes)[0];
        }
        else{
//        	console.log('not all modes');
        	var index = this.getCheckedBox();
        	if(index.length > 0){
	        	mode = '';
	        	for(var i=0; i < index.length; i++){
	        		mode += _.keys(this.modes)[index[i]] + ((i < index.length-1) ? ',' : '');
	        	}
        	}
        	else
        		mode = _.keys(this.modes)[0];
        }
        console.log(mode);
        
        for(var i = 0; i < this.modeControls.length; i++) {
            var control = this.modeControls[i];
            if(control.isApplicableForMode(mode)) {
                container.append($('<div style="height: '+this.controlPadding+';"></div>'));
                container.append(control.$());
                control.doAfterLayout();
            }
        }
    },

    addModeControl : function(widget) {
        this.modeControls.push(widget);
    }

});

//otp.widgets.tripoptions.ModeSelector =
//    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
//
//    id           :  null,
//
//    modes        : otp.config.modes,
//
//    optionLookup : null,
//    modeControls : null,
//
//    initialize : function(tripWidget) {
//    	var this_ = this;
//        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
//        this.id = tripWidget.id+"-modeSelector";
//        this.modeControls = [];
//        this.optionLookup = {};
//
//        //TRANSLATORS: Label for dropdown Travel by: [mode of transport]
//        var html = "<div class='notDraggable'>" + _tr("Travel by") + ": ";
//        html += '<select id="'+this.id+'">';
//        _.each(this.modes, function(text, key) {
//            html += '<option>'+text+'</option>';
//        });
//        html += '</select><hr/>';
//        
////        html += '<div id="' + this.id + '">';
////        _.each(this.mode, function(text, key){
////        	html += '<div id="' + this_.id + key + '">' + text + '<input type="checkbox"/></div>';
////        });
////        html += '</div><hr/>'
//        
//        html += '<div id="'+this.id+'-widgets" style="overflow: hidden;"></div>';
//        html += "</div>";
//
//        $(html).appendTo(this.$());
//        //this.setContent(content);
//    },
//
//    doAfterLayout : function() {
//        var this_ = this;
//        $("#"+this.id).change(function() {
//            this_.tripWidget.inputChanged({
//            	mode : _.keys(this_.modes)[this.selectedIndex],
//            });
//            this_.refreshModeControls();
//        });
//    },
//
//    restorePlan : function(data) {
//        var i = 0;
//        for(mode in this.modes) {
//            if(mode === data.queryParams.mode) {
//                this.tripWidget.module.mode = data.queryParams.mode;
//                $('#'+this.id+' option:eq('+i+')').prop('selected', true);
//            }
//            i++;
//        }
//
//        for(i = 0; i < this.modeControls.length; i++) {
//            this.modeControls[i].restorePlan(data);
//        }
//    },
//
//    controlPadding : "8px",
//
//    refreshModeControls : function() {
//        var container = $("#"+this.id+'-widgets');
//        container.empty();
//        var mode = _.keys(this.modes)[document.getElementById(this.id).selectedIndex];
//        for(var i = 0; i < this.modeControls.length; i++) {
//            var control = this.modeControls[i];
//            if(control.isApplicableForMode(mode)) {
//                container.append($('<div style="height: '+this.controlPadding+';"></div>'));
//                container.append(control.$());
//                control.doAfterLayout();
//            }
//        }
//    },
//
//    addModeControl : function(widget) {
//        this.modeControls.push(widget);
//    }
//
//});


/*START PHUONG *********************************/
otp.widgets.tripoptions.bannedTrips =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-bannedTrips";

		/*var html = '<div class="notDraggable">'+label+'<input id="'+this.id+'-value" type="text" style="width:30px;" value="100" />';
        html += "</div>";

        $(html).appendTo(this.$());*/
		

        ich['otp-tripOptions-bannedTrip']({
            widgetId : this.id,
			label       : _tr("Banned trip")+":",
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() { //PHUONG: if change 'value' to bannedTrip/ OR remove 'value' -->not get the value of the text
		    //var meters = parseFloat($(this).val());

            // If inputed in miles transform to meters to change the value
            //if (!otp.config.metric) { meters = otp.util.Imperial.milesToMeters(meters); } // input field was in miles

            //this_.setDistance(meters);
			this_.tripWidget.inputChanged({
				bannedRoutes : $(this).val(),
				//bannedRoutes : $('#'+this.id+'-value').val(),
				//maxWalkDistance : meters,
			});
        });
 
        /*$("#"+this.id).change(function() {
            this_.tripWidget.inputChanged({
                mode : _.keys(this_.modes)[this.selectedIndex],
            });
            this_.refreshModeControls();
        });*/
		},

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
        /*if(!data.queryParams.maxWalkDistance) return;

        var meters = parseFloat(data.queryParams.maxWalkDistance);
        if (isNaN(meters)) { return; }

        if (!otp.config.metric) { meters = otp.util.Imperial.metersToMiles(meters); }

        $('#'+this.id+'-value').val(meters.toFixed(2));
		this.tripWidget.module.maxWalkDistance = parseFloat(data.queryParams.maxWalkDistance);*/
		
	    if(!data.queryParams.bannedRoutes) this.tripWidget.module.bannedRoutes =  null;
		else
		{
			/*var meters = data.queryParams.bannedRoutes;
			$('#'+this.id+'-value').val(meters);*/
			this.tripWidget.module.bannedRoutes = data.queryParams.bannedRoutes;	
		}	
    },

    /*setDistance : function(distance) {
        this.tripWidget.inputChanged({
            maxWalkDistance : distance,
        });
    },*/
	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});


otp.widgets.tripoptions.costKm =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    valueTruck: 0.3,
    valueTrain: 0.4,
    valueShip: 0.001,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-costKm";

        ich['otp-tripOptions-costKm']({
            widgetId : this.id,
			label       : _tr("Cost per km(truck/train/ship) ")+":",
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-valueTruck').change(function() {
        	if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
	        	this_.valueTruck = $(this).val();
				this_.tripWidget.inputChanged({
					cost_distance_per_km_truck : $(this).val(),
				});
			}
        });
 
        $('#'+this.id+'-valueTrain').change(function() { 
        	if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
	        	this_.valueTrain = $(this).val();
				this_.tripWidget.inputChanged({
					cost_distance_per_km_train : $(this).val(),
				});
			}
        });
		
		$('#'+this.id+'-valueShip').change(function() { 
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.valueShip = $(this).val();
				this_.tripWidget.inputChanged({
					cost_distance_per_km_ship : $(this).val(),
				});
			}
        });
	
		$('#'+this.id+'-valueTruck').val(this_.valueTruck);
		$('#'+this.id+'-valueTrain').val(this_.valueTrain);
		$('#'+this.id+'-valueShip').val(this_.valueShip);
	},

    restorePlan : function(data) { 

	    if(!data.queryParams.cost_distance_per_km_truck) this.tripWidget.module.cost_distance_per_km_truck =  null;
		else
		{
			this.tripWidget.module.cost_distance_per_km_truck = data.queryParams.cost_distance_per_km_truck;	
		}	
		
		if(!data.queryParams.cost_distance_per_km_train) this.tripWidget.module.cost_distance_per_km_train =  null;
		else
		{
			this.tripWidget.module.cost_distance_per_km_train = data.queryParams.cost_distance_per_km_train;	
		}
		
		if(!data.queryParams.cost_distance_per_km_ship) this.tripWidget.module.cost_distance_per_km_ship =  null;
		else
		{
			this.tripWidget.module.cost_distance_per_km_ship = data.queryParams.cost_distance_per_km_ship;	
		}
    },

	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});

otp.widgets.tripoptions.costCO2 =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    value: 0.15,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-costCO2";

        ich['otp-tripOptions-costCO2']({
            widgetId : this.id,
			label       : _tr("Cost per kg CO2")+":",
        }).appendTo(this.$());
        
    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() { //PHUONG: if change 'value' to bannedTrip/ OR remove 'value' -->not get the value of the text
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
	        	this_.value = $(this).val();
				this_.tripWidget.inputChanged({
					co2_cost_per_kg : $(this).val(),
				});
			}
        });
        $('#'+this.id+'-value').val(this_.value);
	},

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
     	
	    if(!data.queryParams.co2_cost_per_kg) this.tripWidget.module.co2_cost_per_kg =  null;
		else
		{
			this.tripWidget.module.co2_cost_per_kg = data.queryParams.co2_cost_per_kg;	
		}	
    },
	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});


otp.widgets.tripoptions.costHour =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    value: 2,
    
    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-costHour";

        ich['otp-tripOptions-costHour']({
            widgetId : this.id,
			label       : _tr("Cost per hour")+":",
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() { //PHUONG: if change 'value' to bannedTrip/ OR remove 'value' -->not get the value of the text
        	if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
	            this_.value = $(this).val();
				this_.tripWidget.inputChanged({
					cost_per_hour : $(this).val(),
					
				});
			}
        });
        $('#'+this.id+'-value').val(this_.value);
	},

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
		
	    if(!data.queryParams.cost_per_hour) this.tripWidget.module.cost_per_hour =  null;
		else
		{
			this.tripWidget.module.cost_per_hour = data.queryParams.cost_per_hour;	
		}	
    },

	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});


otp.widgets.tripoptions.sortResultType =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-sortResultType";
	

        ich['otp-tripOptions-sortResultType']({
            widgetId : this.id,
			label       : _tr("Sort by")+":",
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() { 
		 	this_.tripWidget.inputChanged({
				
				sortResultType : $(this).val(),
			});
        });
 
        },

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
        if(!data.queryParams.sortResultType) this.tripWidget.module.sortResultType =  null;
		else
		{
			this.tripWidget.module.sortResultType = data.queryParams.sortResultType;	
		}	
    },

	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});

otp.widgets.tripoptions.sortResultType1 =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id;


        ich['otp-tripOptions-sortResultType1']({
            widgetId : this.id,
			label       : _tr("Sort by")+":",
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

		$('#'+this.id+'-value').change(function() { 
			//otp.widgets.Dialogs.showOkDialog(_tr('Chan doi'), _tr('Not enough input'));
		 	this_.tripWidget.inputChanged({
				sortResultType : this.selectedIndex,
				//sortResultType : document.getElementById(this.id).selectedIndex,
			    //sortResultType : $(this).val(),//selectedIndex,
			});
        });
		
		/*$('#'+this.id+'-value').onchange(function() {
			var eID = document.getElementById(this.id); 
			var colorVal = eID.options[eID.selectedIndex].value;
			this.tripWidget.module.sortResultType = colorVal;
		});*/
 
		},

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
	    //this.tripWidget.module.sortResultType = data.queryParams.sortResultType;	
		
		if(!data.queryParams.sortResultType)
		{
			//otp.widgets.Dialogs.showOkDialog(_tr('Chan doi1'), _tr('Not enough input'));
			this.tripWidget.module.sortResultType =  0;
		}
		else
		{
			this.tripWidget.module.sortResultType = data.queryParams.sortResultType;	
		}	
    },

	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});

otp.widgets.tripoptions.bannedTrips1 =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    initialize : function(tripWidget) {
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-bannedTrips1";

		/*var html = '<div class="notDraggable">'+label+'<input id="'+this.id+'-value" type="text" style="width:30px;" value="100" />';
        html += "</div>";

        $(html).appendTo(this.$());*/
		

	    ich['otp-tripOptions-bannedTrips1']({
            widgetId : this.id,
			label       : _tr("Banned trip1")+":",
	    }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() { //PHUONG: if change 'value' to bannedTrip/ OR remove 'value' -->not get the value of the text

           this_.tripWidget.inputChanged({
				bannedRoutes : $this.val(),
			});
        });
 
        /*$("#"+this.id).change(function() {
            this_.tripWidget.inputChanged({
                mode : _.keys(this_.modes)[this.selectedIndex],
            });
            this_.refreshModeControls();
        });*/
		},

    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
        if(!data.queryParams.bannedRoutes) this.tripWidget.module.bannedRoutes =  null;
		else
		{
			var meters = data.queryParams.bannedRoutes;

			$('#'+this.id+'-value').val(meters);
			this.tripWidget.module.bannedRoutes = data.queryParams.bannedRoutes;	
		}
        
    },

    /*setDistance : function(distance) {
        this.tripWidget.inputChanged({
            maxWalkDistance : distance,
        });
    },*/
	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});


otp.widgets.tripoptions.location1 =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    geocoder : null,
    nEnd : 1,

    timeSelectorArrive : null,
    capacityWidget : null,
    
    initialize : function(tripWidget, geocoders, timeSelectorArrive, capacityWidget) {
    	
    	this.timeSelectorArrive = timeSelectorArrive;
    	this.capacityWidget = capacityWidget;
    	
    	this.geocoder = geocoders[0];
       
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        this.id = tripWidget.id+"-location2";

        this.$().css({
        	'overflow-y': 'auto',
        	'max-height': '125px'
        });

        
	    ich['otp-tripOptions-location2']({
            widgetId : this.id,
			start: pgettext('template', "Start"),
            end: _tr("End"),
	    }).appendTo(this.$());
		 
		 this.tripWidget.module.on("startChanged", $.proxy(function(latlng, name) {
            $("#"+this.id+"-start").val(name || '(' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')');
        }, this));

        this.tripWidget.module.on("endChanged", $.proxy(function(latlng, name) {
            $("#"+this.id+"-end").val(name || '(' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')');
        }, this));
    },

    doAfterLayout : function() {
		//var places = [];
		var this_ = this;
		
		//Shuai (02-05-2017) load location data from server according to the input (no longer from local json)
		
		//Shuai (13-03-2017) load all the location data from locations.json. 
//		$.getJSON("js/otp/widgets/tripoptions/locations.json", function(data){
//			$.each(data.locations, function(key, val){
//				places.push(val);
//			});
	
		    this_.startInput = this_.initInput($("#"+this_.id+"-start"), this_.tripWidget.module.setStartPoint/*, places*/);
		    this_.endInput = this_.initInput($("#"+this_.id+"-end"), this_.tripWidget.module.setEndPoint/*,places*/, 1);
		    
		    //Shuai (27-04-2017) add more destinations
			$("#"+this_.id+"-addButton").on("click", function(){
				this_.nEnd += 1;
				console.log(this_.nEnd);
				
				var onMapClick = $(this).data('onMapClick');
				
				var str = _tr("End") + this_.nEnd + ":";
				$("#otp-tripOptions-location2-left").append($('<div style="height: 1.8em;">' + str + '</div>'));
				$("#otp-tripOptions-location2-right").css('height', ''+ (1.8 * (this_.nEnd +1)) + 'em');
				$("#otp-tripOptions-location2-right").append($('<div id="otp-tripOptions-location2-right-input'+ this_.nEnd + '" style="position: absolute; top: ' + (1.8 * this_.nEnd) + 'em; left:0px; right: 30px; height: 20px;"><div style="position: absolute; left:0px; right: 16px; top:1px; bottom: 0px;"><input id="' + this_.id + '-end' + this_.nEnd + '" class="borderBox otp-tripOptions-loc-input"></div></div>'));
				$("#otp-tripOptions-location2-right").append($('<div id="otp-tripOptions-location2-right-buttons'+ this_.nEnd +'" style="position: absolute; top:'+ (1.8 * this_.nEnd) + 'em; right:0px; height: 20px;"><button id="' + this_.id + '-clearButton' + this_.nEnd + '" class="otp-tripOptions-loc-reverseBtn" title="Remove this destination"><img src="images/cross.png" /></div>'));
				$('#otp-tripOptions-location2-right-buttons'+ this_.nEnd).append(this);
				
				this_.tripWidget.module.on("endChanged" + this_.nEnd, $.proxy(function(latlng, name, index) {
		            $("#"+this_.id+"-end"+index).val(name || '(' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')');
		        }, this_));
				this_['endInput' + this_.nEnd] = this_.initInput($("#"+this_.id+"-end"+this_.nEnd), this_.tripWidget.module.setEndPoint/*,places*/, this_.nEnd);
				
				//for each additional destination, add an arrival time selector and a capacity widget
				this_.timeSelectorArrive.addSelector(this_.nEnd);
				this_.capacityWidget.addSelector(this_.nEnd);
				
				$('#'+ this_.id + '-clearButton' + this_.nEnd).data({
					'index': this_.nEnd,
					'onMapClick': onMapClick,
				});
				$('#'+ this_.id + '-clearButton' + this_.nEnd).on("click", function(){
					var index = $(this).data('index');
					
					this_.tripWidget.module.removeOrigins(index, $(this).data('onMapClick'));
					
					//remove the corresponding time selector and capacity widget
					this_.timeSelectorArrive.removeSelector(index, this_.nEnd);
					this_.capacityWidget.removeSelector(index, this_.nEnd);
					
					if(index == this_.nEnd){
						if(this_.nEnd == 2)
							$("#"+this_.id+"-addButton").appendTo($('#otp-tripOptions-location2-right-buttons'));
						else{
							$('#otp-tripOptions-location2-right-buttons'+ (this_.nEnd-1)).append($("#"+this_.id+"-addButton"));
							$("#otp-tripOptions-location2-right").css('height', ''+ (1.8 * this_.nEnd) + 'em');
						}
						$('#otp-tripOptions-location2-left div:last').remove();
						$("#otp-tripOptions-location2-right-input" + this_.nEnd).remove();
						$('#otp-tripOptions-location2-right-buttons'+ this_.nEnd).remove();
						
						if(this_.tripWidget.module.otherEndMarker[index]) this_.tripWidget.module.markerLayer.removeLayer(this_.tripWidget.module.otherEndMarker[index]);
						this_.tripWidget.module.otherEndName.pop();
						this_.tripWidget.module.otherEndLatLng.pop();
						this_.tripWidget.module.otherEndMarker.pop();
						
						this_.nEnd -= 1;
					}
					else{
						$('#otp-tripOptions-location2-left div:last').remove();
						$("#otp-tripOptions-location2-right-input" + index).remove();
						$('#otp-tripOptions-location2-right-buttons'+ index).remove();
						
						for(var i= index+1; i <= this_.nEnd; i++){
							$('#otp-tripOptions-location2-right-input' + i).attr('id', 'otp-tripOptions-location2-right-input' + (i-1)).css('top', ''+ (1.8 * (i-1)) + 'em');
							$('#' + this_.id + '-clearButton' + i).data('index', i-1).attr('id', ''+ this_.id + '-clearButton' + (i-1));
							$('#otp-tripOptions-location2-right-buttons'+ i).attr('id', 'otp-tripOptions-location2-right-buttons' + (i-1)).css('top', ''+ (1.8 * (i-1)) + 'em');		
							$('#' + this_.id + '-end' + i).attr('id', ''+ this_.id + '-end' + (i-1));
						}
						
						if(this_.tripWidget.module.otherEndMarker[index]) this_.tripWidget.module.markerLayer.removeLayer(this_.tripWidget.module.otherEndMarker[index]);
						this_.tripWidget.module.otherEndName.splice(index, 1);
						this_.tripWidget.module.otherEndLatLng.splice(index, 1);
						this_.tripWidget.module.otherEndMarker.splice(index, 1);
						
						this_.nEnd -= 1;
						$("#otp-tripOptions-location2-right").css('height', ''+ (1.8 * (this_.nEnd +1)) + 'em');
					}
				});
			});
//		});
		//End Shuai

		//Shuai (15-03-2017) set functionality of the 'reverse' button
		$("#"+this.id+"-reverseButton").on("click", function(){
			var start = this_.tripWidget.module.startLatLng;
			var end = this_.tripWidget.module.endLatLng;
			var startName = this_.tripWidget.module.startName;
			var endName = this_.tripWidget.module.endName;
			this_.tripWidget.module.setStartPoint(end, false, endName);
			this_.tripWidget.module.setEndPoint(start, false, startName, 1);
		});
		//End Shuai		
 	},
	
 	//Shuai (13-07-2017) get sources from geocoder fixed
	initInput : function(input, setterFunction,/*places,*/ index) {
        var this_ = this;
        input.autocomplete({
            delay: 500, // 500ms between requests.
            
            source: function(request, response){
            	var username = this_.tripWidget.module.checkLoginStatus();            	
            	this_.geocoder.geocode(request.term, function(results) {
            		var tmp = _.pluck(results, 'description');
            		var res = [];
            		for(var i=0; i < tmp.length; i++){
            			if(!res.includes(tmp[i].slice(5, tmp[i].length-1)))
            				res.push(tmp[i].slice(5, tmp[i].length-1));
            		}
            		response.call(this, res);
            		input.data("results", this_.getResultLookup(results));
//                    response.call(this, _.pluck(results, 'description'));
//                    input.data("results", this_.getResultLookup(results));
                }, username);
            },
            
			focus: function( event, ui ) {
				input.val(ui.item.label);
				return false;
			},

            select: function(event, ui) {
            	console.log(event.target.id);
            	var order = event.target.id.split('otp-planner-optionsWidget-location2-end')[1];
            	if(order == '')
            		order = 1;
            	console.log(order);
            	
                var result = input.data("results")[ui.item.value];
                var latlng = new L.LatLng(result.lat, result.lng);
                this_.tripWidget.module.webapp.map.lmap.panTo(latlng);
                setterFunction.call(this_.tripWidget.module, latlng, false, /*result.description*/ui.item.value/*.slice(5, ui.item.value.length-1)*/, order);
                this_.tripWidget.inputChanged();
                
                if(event.target.id == 'otp-planner-optionsWidget-location2-start'){
                	if(this_.tripWidget.module.originStartMarker != null){
                		console.log("input start");
                		this_.tripWidget.module.setPolyLine(this_.tripWidget.module.originStartMarker.getLatLng(), latlng, 'start');
                	}
                }
                else if(event.target.id == 'otp-planner-optionsWidget-location2-end'){
                	if(this_.tripWidget.module.originEndMarker != null){
                		this_.tripWidget.module.setPolyLine(this_.tripWidget.module.originEndMarker.getLatLng(), latlng, 'end');
                	}
                }
                else{
                	var order = event.target.id.split('otp-planner-optionsWidget-location2-end')[1];
                	if(this_.tripWidget.module.originOtherEndMarker[order] != null){
                		this_.tripWidget.module.setPolyLine(this_.tripWidget.module.originOtherEndMarker[order].getLatLng(), latlng, order);
                	}
                }
            },
        });
        return input;
    },
    
    getResultLookup : function(results) {
        var resultLookup = {};
        for(var i=0; i<results.length; i++) {
        	resultLookup[results[i].description.slice(5, results[i].description.length-1)] = results[i];
        }
        return resultLookup;
    },


    restorePlan : function(data) { //PHUONG: remove this method --> not appear the default value of the maxWalkDistance
    },
	
	isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);// && otp.util.Itin.includesWalk(mode);
    },

});


/***************** end PHUONG *************************************/

//** MaxWalkSelector **//

otp.widgets.tripoptions.MaxDistanceSelector =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    presets      : null,
    distSuffix   : null,

    /**
    * As we want nice presets in both metric and imperial scale, we can't just do a transformation here, we just declare both
    */

    imperialDistanceSuffix: 'mi.',
    metricDistanceSuffix: 'm.',

    initialize : function(tripWidget) {
        var presets;

        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        // Set it up the system correctly ones, so we don't need to later on
        if (otp.config.metric) {
            this.presets = presets = this.metricPresets;
            this.distSuffix = this.metricDistanceSuffix;
        } else {
            this.presets = this.imperialPresets;
            this.distSuffix = this.imperialDistanceSuffix;
            presets = [];
            // Transform the presets to miles/meters depending on the metric setting
            for (var i = 0; i < this.presets.length; i++) {
                presets.push((otp.util.Imperial.metersToMiles(this.presets[i])).toFixed(2));
            }
        }
        this.id = tripWidget.id+"-maxWalkSelector";

        // currentMaxDistance is used to compare against the title string of the option element, to select the correct one
        var currentMaxDistance = otp.util.Geo.distanceString(this.tripWidget.module.maxWalkDistance);

        ich['otp-tripOptions-maxDistance']({
            widgetId : this.id,
            presets : presets,
            label : this.label,
            //TRANSLATORS: default value for preset values of maximum walk
            //distances in Trip Options
            presets_label : _tr("Presets"),
            distSuffix: this.distSuffix,
            currentMaxDistance: parseFloat(currentMaxDistance)
        }).appendTo(this.$());

    },

    doAfterLayout : function() {
        var this_ = this;

        $('#'+this.id+'-value').change(function() {
            var meters = parseFloat($(this).val());

            // If inputed in miles transform to meters to change the value
            if (!otp.config.metric) { meters = otp.util.Imperial.milesToMeters(meters); } // input field was in miles

            this_.setDistance(meters);
        });

        $('#'+this.id+'-presets').change(function() {
            var presetVal = this_.presets[this.selectedIndex-1];

            // Save the distance in meters
            this_.setDistance(presetVal);

            if (!otp.config.metric) { presetVal = otp.util.Imperial.metersToMiles(presetVal); } // Output in miles

            // Show the value in miles/meters
            $('#'+this_.id+'-value').val(presetVal.toFixed(2));
            $('#'+this_.id+'-presets option:eq(0)').prop('selected', true);
        });
    },

    restorePlan : function(data) {
        if(!data.queryParams.maxWalkDistance) return;

        var meters = parseFloat(data.queryParams.maxWalkDistance);
        if (isNaN(meters)) { return; }

        if (!otp.config.metric) { meters = otp.util.Imperial.metersToMiles(meters); }

        $('#'+this.id+'-value').val(meters.toFixed(2));
        this.tripWidget.module.maxWalkDistance = parseFloat(data.queryParams.maxWalkDistance);
    },

    setDistance : function(distance) {
        this.tripWidget.inputChanged({
            maxWalkDistance : distance,
        });
    },

});

otp.widgets.tripoptions.MaxWalkSelector =
    otp.Class(otp.widgets.tripoptions.MaxDistanceSelector, {

    // miles (0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)
    imperialPresets: [160.9344, 321.8688, 402.336, 482.8032, 643.7376, 804.672, 1207.008, 1609.344, 2414.016, 3218.688, 4023.36, 4828.032, 5632.704, 6437.376, 7242.048000000001, 8046.72],

    // meters
    metricPresets      : [100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000],

    //TRANSLATORS: label for choosing how much should person's trip on foot be
    label       : _tr("Maximum walk")+":",

    initialize : function(tripWidget) {
        this.id = tripWidget.id+"-maxWalkSelector";
        otp.widgets.tripoptions.MaxDistanceSelector.prototype.initialize.apply(this, arguments);
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode) && otp.util.Itin.includesWalk(mode);
    },

});
/******  HET THAN KINH *****************************/

//** PreferredRoutes **//

otp.widgets.tripoptions.PreferredRoutes =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    selectorWidget : null,

    lastSliderValue : null,

    initialize : function(tripWidget) {
        var this_ = this;
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-preferredRoutes";

        ich['otp-tripOptions-preferredRoutes']({
            widgetId : this.id,
            //TRANSLATORS: label Preferred Routes: (routes/None)
            preferredRoutes_label: _tr("Preferred Routes"),
            //TRANSLATORS: button to edit Preffered public transport Routes
            edit: _tr("Edit"),
            //TRANSLATORS: Words in brackets when no Preffered public transport route is set
            none : _tr("None"),
            //TRANSLATORS: Label for Weight slider  to set to preffered public
            //transport routes
            weight: _tr("Weight")
        }).appendTo(this.$());

        //TRANSLATORS: widget title
        this.selectorWidget = new otp.widgets.RoutesSelectorWidget(this.id+"-selectorWidget", this, _tr("Preferred Routes"));
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.selectorWidget.updateRouteList();

            this_.selectorWidget.show();
            if(this_.selectorWidget.isMinimized) this_.selectorWidget.unminimize();
            this_.selectorWidget.bringToFront();
        });

        $('#'+this.id+'-weightSlider').slider({
            min : 0,
            max : 120000,
            value : this_.lastSliderValue || 300,
        })
        .on('slidechange', function(evt) {
            this_.lastSliderValue = $(this).slider('value');
            this_.tripWidget.inputChanged({
                otherThanPreferredRoutesPenalty : this_.lastSliderValue,
            });
        });

    },

    setRoutes : function(paramStr, displayStr) {
        this.tripWidget.inputChanged({
            preferredRoutes : paramStr,
        });
        $('#'+this.id+'-list').html(displayStr);
    },

    restorePlan : function(planData) {
        if(planData.queryParams.preferredRoutes) {
            var this_ = this;

            var restoredIds = [];
            var preferredRoutesArr = planData.queryParams.preferredRoutes.split(',');

            // convert the API's agency_name_id format to standard agency_id
            for(var i=0; i < preferredRoutesArr.length; i++) {
                var apiIdArr = preferredRoutesArr[i].split("_");
                var agencyAndId = apiIdArr[0] + "_" + apiIdArr.pop();
                restoredIds.push(agencyAndId);
            }

            this.selectorWidget.restoredRouteIds = restoredIds;
            if(this.selectorWidget.initializedRoutes) this.selectorWidget.restoreSelected();

            this.tripWidget.module.preferredRoutes = planData.queryParams.preferredRoutes;

            // resolve the IDs to user-friendly names
            var indexApi = this.tripWidget.module.webapp.indexApi;
            indexApi.loadRoutes(this, function() {
                var routeNames = [];
                for(var i = 0; i < restoredIds.length; i++) {
                    var route = indexApi.routes[restoredIds[i]].routeData;
                    routeNames.push(route.shortName || route.longName);
                }
                $('#'+this_.id+'-list').html(routeNames.join(', '));
            });

        }
        else { // none specified
            this.selectorWidget.clearSelected();
            this.selectorWidget.restoredRouteIds = [];
            $('#'+this.id+'-list').html('('+_tr("None")+')');
            this.tripWidget.module.preferredRoutes = null;
        }
        if(planData.queryParams.otherThanPreferredRoutesPenalty) {
            this.lastSliderValue = planData.queryParams.otherThanPreferredRoutesPenalty;
            $('#'+this.id+'-weightSlider').slider('value', this.lastSliderValue);
        }
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});


//** BannedRoutes **//

otp.widgets.tripoptions.BannedRoutes =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    selectorWidget : null,

    initialize : function(tripWidget, geocoders) {
        var this_ = this;
        this.geocoder = geocoders[0];
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-bannedRoutes";

        var html = '<div class="notDraggable">';
        //TRANSLATORS: buton edit Banned public transport routes
        var html = '<div style="float:right; font-size: 12px;"><button id="'+this.id+'-button">' + _tr("Edit") + '…</button></div>';
        //TRANSLATORS: label Banned public transport Routes: (routes/None)
        //(Routes you don't want to take)
        html += _tr("Banned routes") + ': <span id="'+this.id+'-list">('+_tr("None")+')</span>';
        html += '<div style="clear:both;"></div></div>';

        $(html).appendTo(this.$());

        //TRANSLATORS: Widget title
        this.selectorWidget = new otp.widgets.RoutesSelectorWidget(this.id+"-selectorWidget", this, _tr("Banned routes"), this.geocoder, true);
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.selectorWidget.updateRouteList();
            this_.selectorWidget.show();
            if(this_.selectorWidget.isMinimized) this_.selectorWidget.unminimize();
            this_.selectorWidget.bringToFront();
        });
    },

    setRoutes : function(paramStr, displayStr) {
        this.tripWidget.inputChanged({
            bannedRoutes : paramStr,
        });
        $('#'+this.id+'-list').html(displayStr);
    },

    restorePlan : function(planData) {
        if(planData.queryParams.bannedRoutes) {
            var this_ = this;

            var restoredIds = [];
            var bannedRoutesArr = planData.queryParams.bannedRoutes.split(',');
			//PHUONG: format is 1__[routeID];   
			//for example: 1__ATHEN_MILAN,1__ATHEN_MILAN1 --> 2 routes are banned
		 

            // convert the API's agency_name_id format to standard agency_id
            for(var i=0; i < bannedRoutesArr.length; i++) {
                var apiIdArr = bannedRoutesArr[i].split("_");
                var agencyAndId = apiIdArr[0] + "_" + apiIdArr.pop();
                restoredIds.push(agencyAndId);
            }

            this.selectorWidget.restoredRouteIds = restoredIds;
            if(this.selectorWidget.initializedRoutes) this.selectorWidget.restoreSelected();

            this.tripWidget.module.bannedRoutes = planData.queryParams.bannedRoutes;

            // resolve the IDs to user-friendly names
            var indexApi = this.tripWidget.module.webapp.indexApi;
            indexApi.loadRoutes(this, function() {
                var routeNames = [];
                for(var i = 0; i < restoredIds.length; i++) {
                    var route = indexApi.routes[restoredIds[i]].routeData;
                    routeNames.push(route.shortName || route.longName);
                }
                $('#'+this_.id+'-list').html(routeNames.join(', '));
            });

        }
        else { // none specified
            this.selectorWidget.clearSelected();
            this.selectorWidget.restoredRouteIds = [];
            $('#'+this.id+'-list').html('('+_tr("None")+')');
            this.tripWidget.module.bannedRoutes = null;
        }
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});


//** BikeTriangle **//

otp.widgets.tripoptions.BikeTriangle =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    bikeTriangle :  null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
//        console.log(this);
//        console.log(arguments);
        this.id = tripWidget.id+"-bikeTriangle";

        var content = '';
        //content += '<h6 class="drag-to-change">Drag to Change Trip:</h6>';
        content += '<div id="'+this.id+'" class="otp-bikeTriangle notDraggable" style="width:340px"></div>';
        
        //Shuai (20-03-2017) fix the button
        content += '<input type="button" value="reset" style="margin-left:30px" id="' + this.id + '-reset' + '"></input>';
        //End Shuai
        
        this.setContent(content);
    },

    doAfterLayout : function() {		
        if(!this.bikeTriangle) 
        	this.bikeTriangle = new otp.widgets.BikeTrianglePanel(this.id);
        var this_ = this;
        this.bikeTriangle.onChanged = function() {
        	console.log(this.bikeTriangle);
            var formData = this_.bikeTriangle.getFormData();
            console.log(this_.tripWidget.inputChanged);
            this_.tripWidget.inputChanged({
                //optimize : "TRIANGLE",
                co2_w 				: formData.co2_w,
                time_w			    : formData.time_w,
                distance_w 			: formData.distance_w,
            });

        };
        
        //Shuai (09-03-2017) add a button to reset the bikeTriangle
        $("#" + this.id + '-reset').on("click", function(){
        	this_.bikeTriangle.setValues(0.333, 0.333, 0.334);
        	this_.tripWidget.inputChanged({
                co2_w 				: 0.333,
                time_w			    : 0.333,
                distance_w 			: 0.334,
            });
        })
        //End Shuai
    },

    restorePlan : function(planData) {
            this.bikeTriangle.setValues(planData.queryParams.co2_w,
                                        planData.queryParams.time_w,
                                        planData.queryParams.distance_w);

		/*if(planData.queryParams.optimize === 'TRIANGLE') {
            this.bikeTriangle.setValues(planData.queryParams.co2_w,
                                        planData.queryParams.time_w,
                                        planData.queryParams.distance_w);
        }*/
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});


//** BikeType **//

otp.widgets.tripoptions.BikeType =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-bikeType";
        this.$().addClass('notDraggable');

        var content = '';
        //TRANSLATORS: In Bike share planner radio button: <Use>: My Own Bike A shared bike
        content += _tr('Use') + ': ';
        //TRANSLATORS: In Bike share planner radio button: Use: <My Own Bike> A shared bike
        content += '<input id="'+this.id+'-myOwnBikeRBtn" type="radio" name="bikeType" value="my_bike" checked> ' + _tr("My Own Bike") + '&nbsp;&nbsp;';
        //TRANSLATORS: In Bike share planner radio button: Use: My Own Bike <A Shared bike>
        content += '<input id="'+this.id+'-sharedBikeRBtn" type="radio" name="bikeType" value="shared_bike"> ' + _tr("A Shared Bike");

        this.setContent(content);
    },

    doAfterLayout : function() {
        //var module = this.tripWidget.module;
        var this_ = this;
        $('#'+this.id+'-myOwnBikeRBtn').click(function() {
            //module.mode = "BICYCLE";
            //module.planTrip();
            this_.tripWidget.inputChanged({
                mode : "BICYCLE",
            });

        });
        $('#'+this.id+'-sharedBikeRBtn').click(function() {
            //module.mode = "WALK,BICYCLE";
            //module.planTrip();
            this_.tripWidget.inputChanged({
                mode : "WALK,BICYCLE_RENT",
            });
        });
    },

    restorePlan : function(planData) {
        if(planData.queryParams.mode === "BICYCLE") {
            $('#'+this.id+'-myOwnBikeRBtn').attr('checked', 'checked');
        }
        if(planData.queryParams.mode === "WALK,BICYCLE_RENT") {
            $('#'+this.id+'-sharedBikeRBtn').attr('checked', 'checked');
        }
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesBicycle(mode) && otp.util.Itin.includesWalk(mode);
    }

});


//** TripSummary **//

otp.widgets.tripoptions.TripSummary =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id  : null,

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-tripSummary";


        var content = '';
        content += '<div id="'+this.id+'-distance" class="otp-tripSummary-distance"></div>';
        content += '<div id="'+this.id+'-duration" class="otp-tripSummary-duration"></div>';
        content += '<div id="'+this.id+'-timeSummary" class="otp-tripSummary-timeSummary"></div>';
        this.setContent(content);
    },

    newItinerary : function(itin) {
    	var dist = 0;

    	for(var i=0; i < itin.legs.length; i++) {
    		dist += itin.legs[i].distance;
        }

        $("#"+this.id+"-distance").html(otp.util.Geo.distanceString(dist));
        $("#"+this.id+"-duration").html(otp.util.Time.secsToHrMin(itin.duration));

        var timeByMode = { };
        for(var i=0; i < itin.legs.length; i++) {
            if(itin.legs[i].mode in timeByMode) {
                timeByMode[itin.legs[i].mode] = timeByMode[itin.legs[i].mode] + itin.legs[i].duration;
            }
            else {
                timeByMode[itin.legs[i].mode] = itin.legs[i].duration;
            }
        }

        var summaryStr = "";
        for(mode in timeByMode) {
            summaryStr += otp.util.Time.secsToHrMin(timeByMode[mode]) + " " + this.getModeName(mode) + " / ";
        }
        summaryStr = summaryStr.slice(0, -3);
        $("#"+this.id+"-timeSummary").html(summaryStr);
    },

    getModeName : function(mode) {
        switch(mode) {
            case 'WALK':
                return "walking";
            case 'BICYCLE':
                return "biking";
        }
        return "n/a";
    }
});


//** AddThis **//

otp.widgets.tripoptions.AddThis =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);

        var content = '';
        content += '<h6 id="share-route-header">Share this Trip:</h6>';
        content += '<div id="share-route"></div>';

        this.setContent(content);
    },

    doAfterLayout : function() {
        // Copy our existing share widget from the header and customize it for route sharing.
        // The url to share is set in PlannerModule.js in the newTrip() callback that is called
        // once a new route is loaded from the server.
        var addthisElement = $(".addthis_toolbox").clone();
        addthisElement.find(".addthis_counter").remove();

        // give this addthis toolbox a unique class so we can activate it alone in Webapp.js
        addthisElement.addClass("addthis_toolbox_route");
        addthisElement.appendTo("#share-route");
        addthisElement.attr("addthis:title", "Check out my trip planned on "+otp.config.siteName);
        addthisElement.attr("addthis:description", otp.config.siteDescription);
    }
});


//** Submit **//

otp.widgets.tripoptions.Submit =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-submit";

        //TRANSLATORS: button to send query for trip planning
        $('<div class="notDraggable" style="text-align:center;"><button id="'+this.id+'-button">' + _tr("Plan Your Trip") + '</button></div>').appendTo(this.$());
        //console.log(this.id+'-button')

    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            //this_.tripWidget.pushSettingsToModule();
            if(typeof this_.tripWidget.module.userPlanTripStart == 'function') this_.tripWidget.module.userPlanTripStart();
            this_.tripWidget.module.planTripFunction.apply(this_.tripWidget.module);
        });
    }
});

//** Group Trip **//

otp.widgets.tripoptions.GroupTripOptions =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {


    initialize : function(tripWidget, label) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-groupTripOptions";

        label = label || "Group size: ";
        var html = '<div class="notDraggable">'+label+'<input id="'+this.id+'-value" type="text" style="width:30px;" value="100" />';
        html += "</div>";

        $(html).appendTo(this.$());
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-value').change(function() {
            //this_.tripWidget.module.groupSize = parseInt($('#'+this_.id+'-value').val());
            this_.tripWidget.inputChanged({
                groupSize : parseInt($('#'+this_.id+'-value').val()),
            });

        });
    },

    restorePlan : function(data) {
        if(_.has(data.queryParams, 'groupSize')) {
            $('#'+this.id+'-value').val(data.queryParams['groupSize']);
            this.tripWidget.module.groupSize = parseInt(data.queryParams['groupSize']);
        }
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }
});

/*otp.widgets.TW_GroupTripSubmit =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    initialize : function(tripWidget) {
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-gtSubmit";

        $('<div class="notDraggable" style="text-align:center;"><button id="'+this.id+'-button">Plan Trip</button></div>').appendTo(this.$());
        //console.log(this.id+'-button')

    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.tripWidget.module.groupTripSubmit();
        });
    }
});*/


//Shuai (07-04-2017) the widget to define the necessary intermediate stops
//** PassBy **//
otp.widgets.tripoptions.PassBy =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    geocoder: null,

    selectorWidget : null,

    initialize : function(tripWidget, geocoders) {
    	this.geocoder = geocoders[0];
    	
        var this_ = this;
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-passBy";

        var html = '<div class="notDraggable">';
        var html = '<div style="float:right; font-size: 12px;"><button id="'+this.id+'-button">' + _tr("Edit") + '…</button></div>';
        html += _tr("Pass By") + ': <span id="'+this.id+'-list">('+_tr("None")+')</span>';
        html += '<div style="clear:both;"></div></div>';

        $(html).appendTo(this.$());

        //TRANSLATORS: Widget title
        this.selectorWidget = new otp.widgets.LocationSelectorWidget(this.id+"-selectorWidget", this, _tr("Pass By"), this.geocoder, true);
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.selectorWidget.updateRouteList();
            this_.selectorWidget.show();
            if(this_.selectorWidget.isMinimized) this_.selectorWidget.unminimize();
            this_.selectorWidget.bringToFront();
        });
    },

    setRoutes : function(param, displayStr) {
        this.tripWidget.inputChanged({
            passBy : (param.length > 0 ? param: null),
        });
        $('#'+this.id+'-list').html(displayStr);
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});


//Shuai (06-06-2017)
//** Banned stops **//
otp.widgets.tripoptions.BannedStops =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,
    geocoder: null,

    selectorWidget : null,

    initialize : function(tripWidget, geocoders) {
    	this.geocoder = geocoders[0];
    	
        var this_ = this;
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-BannedStops";

        var html = '<div class="notDraggable">';
        var html = '<div style="float:right; font-size: 12px;"><button id="'+this.id+'-button">' + _tr("Edit") + '…</button></div>';
        html += _tr("Banned Stops") + ': <span id="'+this.id+'-list">('+_tr("None")+')</span>';
        html += '<div style="clear:both;"></div></div>';

        $(html).appendTo(this.$());

        //TRANSLATORS: Widget title
        this.selectorWidget = new otp.widgets.LocationSelectorWidget(this.id+"-selectorWidget", this, _tr("Banned Stops"), this.geocoder, true);
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.selectorWidget.updateRouteList();
            this_.selectorWidget.show();
            if(this_.selectorWidget.isMinimized) this_.selectorWidget.unminimize();
            this_.selectorWidget.bringToFront();
        });
    },

    setRoutes : function(param, displayStr) {
        this.tripWidget.inputChanged({
            BannedStops : (param.length > 0 ? param: null),
        });
        $('#'+this.id+'-list').html(displayStr);
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});


//Shuai (06-06-2017)
//** Forced Routes **//
otp.widgets.tripoptions.ForcedRoutes =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id           :  null,

    selectorWidget : null,

    initialize : function(tripWidget, geocoders) {
        var this_ = this;
        this.geocoder = geocoders[0];
        otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
        this.id = tripWidget.id+"-ForcedRoutes";

        var html = '<div class="notDraggable">';
        //TRANSLATORS: buton edit Banned public transport routes
        var html = '<div style="float:right; font-size: 12px;"><button id="'+this.id+'-button">' + _tr("Edit") + '…</button></div>';
        //TRANSLATORS: label Banned public transport Routes: (routes/None)
        //(Routes you don't want to take)
        html += _tr("Forced Routes") + ': <span id="'+this.id+'-list">('+_tr("None")+')</span>';
        html += '<div style="clear:both;"></div></div>';

        $(html).appendTo(this.$());

        //TRANSLATORS: Widget title
        this.selectorWidget = new otp.widgets.RoutesSelectorWidget(this.id+"-selectorWidget", this, _tr("Forced routes"), this.geocoder, true);
    },

    doAfterLayout : function() {
        var this_ = this;
        $('#'+this.id+'-button').button().click(function() {
            this_.selectorWidget.updateRouteList();
            this_.selectorWidget.show();
            if(this_.selectorWidget.isMinimized) this_.selectorWidget.unminimize();
            this_.selectorWidget.bringToFront();
        });
    },

    setRoutes : function(paramStr, displayStr) {
        this.tripWidget.inputChanged({
        	ForcedRoutes : paramStr,
        });
        $('#'+this.id+'-list').html(displayStr);
    },

    restorePlan : function(planData) {
        if(planData.queryParams.ForcedRoutes) {
            var this_ = this;

            var restoredIds = [];
            var ForcedRoutesArr = planData.queryParams.ForcedRoutes.split(',');
			//PHUONG: format is 1__[routeID];   
			//for example: 1__ATHEN_MILAN,1__ATHEN_MILAN1 --> 2 routes are banned
		 

            // convert the API's agency_name_id format to standard agency_id
            for(var i=0; i < ForcedRoutesArr.length; i++) {
                var apiIdArr = ForcedRoutesArr[i].split("_");
                var agencyAndId = apiIdArr[0] + "_" + apiIdArr.pop();
                restoredIds.push(agencyAndId);
            }

            this.selectorWidget.restoredRouteIds = restoredIds;
            if(this.selectorWidget.initializedRoutes) this.selectorWidget.restoreSelected();

            this.tripWidget.module.ForcedRoutes = planData.queryParams.ForcedRoutes;

            // resolve the IDs to user-friendly names
            var indexApi = this.tripWidget.module.webapp.indexApi;
            indexApi.loadRoutes(this, function() {
                var routeNames = [];
                for(var i = 0; i < restoredIds.length; i++) {
                    var route = indexApi.routes[restoredIds[i]].routeData;
                    routeNames.push(route.shortName || route.longName);
                }
                $('#'+this_.id+'-list').html(routeNames.join(', '));
            });

        }
        else { // none specified
            this.selectorWidget.clearSelected();
            this.selectorWidget.restoredRouteIds = [];
            $('#'+this.id+'-list').html('('+_tr("None")+')');
            this.tripWidget.module.ForcedRoutes = null;
        }
    },

    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }

});



//Shuai (02-05-2017)
//widget to test one-line generic call
otp.widgets.tripoptions.genericCall =
    otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

    id : null,
    	
    initialize : function(tripWidget) {
    	 var this_ = this;
         otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
         this.id = tripWidget.id+"-genericCall";
         
         var html = '<div class="notDraggable">';
         html += '<input id=' + this.id + ' class="borderBox otp-tripOptions-loc-input"> </div>';
         html += '<input id="' + this.id + '-checkbox" type="checkbox"/>'
         $(html).appendTo(this.$());
    },
    
    doAfterLayout : function(){
    	var this_ = this;
    	
    	$('#' + this.id + '-checkbox').change(function(){
    		if(this.checked)
    			this_.tripWidget.module.genericTool = true;
    		else
    			this_.tripWidget.module.genericTool = false;
    	});
    },
    
    isApplicableForMode : function(mode) {
        return otp.util.Itin.includesTransit(mode);
    }
});


//Shuai (23-10-2017)
//KRI circle
otp.widgets.tripoptions.RiskTriangle =
  otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
  
  id           :  null,
  riskTriangle :  null,
  	
  initialize : function(tripWidget) {
  	   var this_ = this;
       otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
       this.id = tripWidget.id+"-riskTriangle";
       
       var html = '<div class="notDraggable">';
       html += '<div id="'+this.id+'" class="otp-riskTriangle notDraggable" style="width:340px"></div>';
       html += '<input type="button" value="reset" style="margin-left:30px" id="riskTriangleReset"/>'
       $(html).appendTo(this.$());
  },
  
  doAfterLayout : function(){
  	var this_ = this;
  	if(!this.riskTriangle)
  		this.riskTriangle = new otp.widgets.RiskTrianglePanel(this.id);

  	this.riskTriangle.onChanged = function(){
  		var formData = this_.riskTriangle.getFormData();
  		this_.tripWidget.inputChanged({
			KRI_time_w						: formData.time_w,
			KRI_flexibility_w				: formData.flexibility_w,
			KRI_safety_w					: formData.safety_w,
			KRI_cost_w						: formData.cost_w,
        });
  	};
  	
  	$('#riskTriangleReset').click(function(){
  		this_.riskTriangle.setValues(0.25, 0.25, 0.25, 0.25);
  		this_.tripWidget.inputChanged({
			KRI_time_w						: 0.25,
			KRI_flexibility_w				: 0.25,
			KRI_safety_w					: 0.25,
			KRI_cost_w						: 0.25,
        });
  	});
  },
  
  isApplicableForMode : function(mode) {
      return otp.util.Itin.includesTransit(mode);
  }
});


//Shuai (18-01-2018)
//widget for enable/disable risk analysis
otp.widgets.tripoptions.riskAnalysis =
  otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {

  id : null,
  	
  initialize : function(tripWidget) {
  	 var this_ = this;
       otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
       this.id = tripWidget.id+"-riskCheckbox";
       
       var html = '<span class="notDraggable">';
       html += '<text>Risk Analysis:  </text></span>';
       html += '<input id="' + this.id + '-checkbox" type="checkbox"/>'
       $(html).appendTo(this.$());
  },
  
  doAfterLayout : function(){
  	var this_ = this;
  	
  	$('#' + this.id + '-checkbox').change(function(){
  		if(this.checked)
  			this_.tripWidget.module.riskAnalysis = true;
  		else
  			this_.tripWidget.module.riskAnalysis = false;
  	});
  },
  
  isApplicableForMode : function(mode) {
      return otp.util.Itin.includesTransit(mode);
  }
});


//Shuai (12-02-2018)
//capacity widget
otp.widgets.tripoptions.capacityWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	tripWidget: null,
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-capacityWidget";
	     
	     this.tripWidget = tripWidget;
	      
	     var html = '<div><span class="notDraggable">';
	     html += '<text>Number of containers:  </text></span>';
	     html += '<input id="' + this.id + '-input" type="text"/></div>'
	     $(html).appendTo(this.$());
	     
	     this.$().css({
	    	 'overflow-y': 'auto',
	    	 'max-height': '100px'
	     });
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		$('#' + this.id + '-input').change(function(){
			this_.tripWidget.inputChanged({
				numContainer : $(this).val(),
			});
		});
	},
	
	addSelector: function(index){
		var this_ = this;
    	var newLabel = _tr(' Number of containers(End ' + index + ' )');
    	
    	var html = '<div><div style="clear:both; margin-bottom:5px"/><span class="notDraggable">';
	    html += '<text>' + newLabel + '</text></span>';
	    html += '<input id="' + this.id + '-input' + index +'" type="text"/></div>'
	    $(html).appendTo(this.$());

	    this_.tripWidget.module.otherCapacity[index-2] = '';
	    
	    $('#' + this.id + '-input' + index).data('id', index);
	    $('#' + this.id + '-input' + index).change(function(){
	    	var id = $(this).data('id');
//            console.log(this_.tripWidget.module.otherCapacity);
            this_.tripWidget.module.otherCapacity[id-2] = $(this).val();
//            console.log(this_.tripWidget.module.otherCapacity);
	    });
	},
	
	removeSelector: function(index, total){
		var this_ = this;
    	
		$('#' + this.id + '-input' + index).parent().remove();
		
		if(index == total){
    		this_.tripWidget.module.otherCapacity.pop();
    	}
		else{
			for(var i= index+1; i <= total; i++){
				var label = $('#'+ this.id + '-input' + i).siblings('span').text().split(' ');
    			label[4] = label[4] - 1;
    			$('#'+ this.id + '-input' + i).siblings('span').text(label.join(' '));
    			
				$('#'+ this.id + '-input' + i).data('id', i-1).attr('id', '' + this.id + '-input' + (i-1));
			}
//			console.log(this_.tripWidget.module.otherCapacity);
			this_.tripWidget.module.otherCapacity.splice(index-2, 1);
//			console.log(this_.tripWidget.module.otherCapacity);
		}
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


//Shuai (27-02-2018)
//general configuration widget
otp.widgets.tripoptions.generalConfigurationWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	tripWidget: null,
	generalConfData: [],
	bikeTriangle: null,
	riskTriangle: null,
		
	initialize : function(tripWidget, bikeTriangle, riskTriangle) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-generalConfigurationWidget";
	     this.tripWidget = tripWidget;
	     this.bikeTriangle = bikeTriangle;
	     this.riskTriangle = riskTriangle;

	     var html = '<span class="notDraggable">';
	     html += '<select id="' + this.id + '-generalList"><option selected disabled>Select general configuration</option></select>'
	     $(html).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		//given by query parameter
		var username;
		if(this.tripWidget.module.username != null)
			username = this.tripWidget.module.username; 
		else 
			username = 'asd';
		
		var url = otp.config.hostname + '/otp/routers/' + username + '/user/genericConfiguration/getList';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.generalConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-generalList'));
					}
				}
			},
		});
		
		$('#' + this.id + '-generalList').change(function(){
			var index = this.selectedIndex - 1;
			var content = this_.generalConfData[index];
			
			$('#' + this_.tripWidget.id + '-costCO2-value').val(content.costPerKgCO2);
			$('#' + this_.tripWidget.id + '-costHour-value').val(content.costPerHour);
			this_.bikeTriangle.bikeTriangle.setValues(content.KPICO2, content.KPITime, content.KPIDistance);
			this_.riskTriangle.riskTriangle.setValues(content.KRITime, content.KRIFlexibility, content.KRISafety, content.KRICost);
		});
	},
	
	updateInfo: function(index, data){
		this.generalConfData = data;
		var div = $('#' + this.id + '-generalList'); 
		div.empty();
		div.append($('<option selected disabled>Select general configuration</option>'));
		for(var i=0; i < data.length; i++){
			$('<option>' + data[i].configurationName + '</option>').appendTo(div);
		}
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


//vehicle configuration widget
otp.widgets.tripoptions.vehicleConfigurationWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	tripWidget: null,
	
	truckConfData: [],
	trainConfData: [],
	shipConfData: [],
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-vehicleConfigurationWidget";
	     this.tripWidget = tripWidget;
	     
	     var html = '<span class="notDraggable">';
	     html += '<div><text>Select vehicle configuration:</text></br>';
	     html += '<span><select id="' + this.id + '-truckList"><option selected disabled>Truck</option></select></span>';
	     html += '<span><select id="' + this.id + '-trainList" style="margin-left:20px;"><option selected disabled>Train</option></select></span>';
	     html += '<span><select id="' + this.id + '-shipList" style="margin-left:20px;"><option selected disabled>Ship</option></select></span></div>';
	     $(html).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		//given by query parameter
		var username;
		if(this.tripWidget.module.username != null)
			username = this.tripWidget.module.username; 
		else 
			username = 'asd';
		
		var url = otp.config.hostname + '/otp/routers/' + username + '/user/vehicleConfiguration/getListByMode/Truck';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.truckConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-truckList'));
					}
				}				
			},
		});
		
		var url = otp.config.hostname + '/otp/routers/' + username + '/user/vehicleConfiguration/getListByMode/Train';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.trainConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-trainList'));
					}
				}				
			},
		});
		
		var url = otp.config.hostname + '/otp/routers/' + username + '/user/vehicleConfiguration/getListByMode/Ship';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.shipConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-shipList'));
					}
				}				
			},
		});
		
		$('#' + this.id + '-truckList').change(function(){
			var index = this.selectedIndex - 1;
			var content = this_.truckConfData[index];

			$('#' + this_.tripWidget.id + '-costKm-valueTruck').val(content.costPerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-CO2perKMTruck').val(content.CO2PerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-boardingTruck').val(content.boarding);
			$('#' + this_.tripWidget.id + '-confDataWidget-alightingTruck').val(content.alighting);
			$('#' + this_.tripWidget.id + '-confDataWidget-speed').val(content.speed);
		});
		
		$('#' + this.id + '-trainList').change(function(){
			var index = this.selectedIndex - 1;
			var content = this_.trainConfData[index];
			
			$('#' + this_.tripWidget.id + '-costKm-valueTrain').val(content.costPerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-CO2perKMTrain').val(content.CO2PerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-boardingTrain').val(content.boarding);
			$('#' + this_.tripWidget.id + '-confDataWidget-alightingTrain').val(content.alighting);
			$('#' + this_.tripWidget.id + '-confDataWidget-capacityTrain').val(content.capacity);
		});
		
		$('#' + this.id + '-shipList').change(function(){
			var index = this.selectedIndex - 1;
			var content = this_.shipConfData[index];
			
			$('#' + this_.tripWidget.id + '-costKm-valueShip').val(content.costPerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-CO2perKMShip').val(content.CO2PerKm);
			$('#' + this_.tripWidget.id + '-confDataWidget-boardingShip').val(content.boarding);
			$('#' + this_.tripWidget.id + '-confDataWidget-alightingShip').val(content.alighting);
			$('#' + this_.tripWidget.id + '-confDataWidget-capacityShip').val(content.capacity);
			$('#' + this_.tripWidget.id + '-confDataWidget-CO2perKMFast').val(content.CO2PerKmFast);
			$('#' + this_.tripWidget.id + '-confDataWidget-CO2perKMSlow').val(content.CO2PerKmSlow);
			$('#' + this_.tripWidget.id + '-confDataWidget-boardingRORO').val(content.boardingRoRo);
			$('#' + this_.tripWidget.id + '-confDataWidget-alightingRORO').val(content.alightingRoRo);
		});
	},
	
	updateInfo: function(index, data){
		console.log(data);
		this.truckConfData = [];
		this.trainConfData = [];
		this.shipConfData = [];
		
		$('#' + this.id + '-truckList').empty(); 
		$('#' + this.id + '-truckList').append($('<option selected disabled>Truck</option>'));
		$('#' + this.id + '-trainList').empty(); 
		$('#' + this.id + '-trainList').append($('<option selected disabled>Train</option>'));
		$('#' + this.id + '-shipList').empty(); 
		$('#' + this.id + '-shipList').append($('<option selected disabled>Ship</option>'));
		
		for(var i=0; i < data.length; i++){
			if(data[i].mode == 'Truck'){
				this.truckConfData.push(data[i]);
				$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this.id + '-truckList'));
			}
			else if(data[i].mode == 'Train'){
				this.trainConfData.push(data[i]);
				$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this.id + '-trainList'));
			}
			else if(data[i].mode == 'Ship'){
				this.shipConfData.push(data[i]);
				$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this.id + '-shipList'));
			}
		}
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


//routes configuration widget
otp.widgets.tripoptions.routesConfigurationWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	tripWidget: null,
	routesConfData: [],
	
	bannedRoutes: null, 
	forcedRoutes: null, 
	passBy: null, 
	bannedStops: null,
		
	initialize : function(tripWidget, bannedRoutes, forcedRoutes, passBy, bannedStops) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-routesConfigurationWidget";
	     this.tripWidget = tripWidget;
	     
	     this.bannedRoutes = bannedRoutes;
	     this.forcedRoutes = forcedRoutes;
	     this.passBy = passBy;
	     this.bannedStops = bannedStops;
	     
	     var html = '<span class="notDraggable">';
	     html += '<select id="' + this.id + '-routesList"><option selected disabled>Select routes configuration</option></select>'
	     $(html).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		//given by query parameter
		var username;
		if(this.tripWidget.module.username != null)
			username = this.tripWidget.module.username; 
		else 
			username = 'asd';
		
		var url = otp.config.hostname + '/otp/routers/' + username + '/user/routesConfiguration/getList';
		$.ajax(url, {
			success: function(data){
				console.log(data);
				if(data != null){
					this_.routesConfData = data;
					for(var i=0; i < data.length; i++){
						$('<option>' + data[i].configurationName + '</option>').appendTo($('#' + this_.id + '-routesList'));
					}
				}				
			},
		});
		
		$('#' + this.id + '-routesList').change(function(){
			var index = this.selectedIndex - 1;
			var content = this_.routesConfData[index];
			
			var bannedRoutesList = this_.manipulateList(content.bannedRoutes, ',');
			var forcedRoutesList = this_.manipulateList(content.forcedRoutes, ',');
			var passByList = this_.manipulateList(content.passBy, ';');
			var bannedStopsList = this_.manipulateList(content.bannedStops, ';');
			
			this_.bannedRoutes.setRoutes(content.bannedRoutes, bannedRoutesList.join(','));
			this_.forcedRoutes.setRoutes(content.forcedRoutes, forcedRoutesList.join(','));
			this_.passBy.setRoutes(content.passBy, passByList.join(','));
			this_.bannedStops.setRoutes(content.bannedStops, bannedStopsList.join(','));
			
			this_.setSelectedList('#' + this_.bannedRoutes.selectorWidget.id + '-selectedList', bannedRoutesList, content.bannedRoutes, this_.bannedRoutes.selectorWidget, ',');
			this_.setSelectedList('#' + this_.forcedRoutes.selectorWidget.id + '-selectedList', forcedRoutesList, content.forcedRoutes, this_.forcedRoutes.selectorWidget, ',');
			this_.setSelectedList('#' + this_.passBy.selectorWidget.id + '-selectedList', passByList, content.passBy, this_.passBy.selectorWidget, ';');
			this_.setSelectedList('#' + this_.bannedStops.selectorWidget.id + '-selectedList', bannedStopsList, content.bannedStops, this_.bannedStops.selectorWidget, ';');
		});
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
	
	updateInfo: function(index, data){
		this.routesConfData = data;
		var div = $('#' + this.id + '-routesList'); 
		div.empty();
		div.append($('<option selected disabled>Select routes configuration</option>'));
		for(var i=0; i < data.length; i++){
			$('<option>' + data[i].configurationName + '</option>').appendTo(div);
		}
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


//Shuai (27-02-2018)
//other configuration data
otp.widgets.tripoptions.confDataWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-confDataWidget";
	     this.tripWidget = tripWidget;

	     ich['otp-tripOptions-confDataWidget']({
	    	 widgetID: this.id,
	    	 CO2perKM: 'CO2 per KM(truck/train/ship)',
	    	 CO2perKMSlow: 'CO2 per KM(ship slow)',
	    	 CO2perKMFast: 'CO2 per KM(ship fast)',
	    	 boarding: 'Boarding Time(truck/train/ship)',
	    	 alighting: 'Alighting Time(truck/train/ship)',
	    	 boardingRORO: 'Boarding Time(ship RORO)',
	    	 alightingRORO: 'Alighting Time(ship RORO)',
	    	 speed: 'Truck speed',
	    	 capacity: 'Capacity(train/ship)',
	     }).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		$('#'+this.id+'-CO2perKMTruck').val('0.25').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					co2_per_km_truck : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-CO2perKMTrain').val('0.06').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					co2_per_km_train : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-CO2perKMShip').val('80').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					co2_per_km_ship : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-CO2perKMSlow').val('60').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					co2_per_km_ship_Slow : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-CO2perKMFast').val('100').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					co2_per_km_ship_Fast : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-boardingTruck').val('60').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					boarding_truck : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-boardingTrain').val('120').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					boarding_train : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-boardingShip').val('360').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					boarding_ship : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-alightingTruck').val('60').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					alighting_truck : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-alightingTrain').val('120').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					alighting_train : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-alightingShip').val('360').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					alighting_ship : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-boardingRORO').val('180').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					boarding_ship_roro : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-alightingRORO').val('180').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					alighting_ship_roro : $(this).val(),
				});
			}
        });
//		$('#'+this.id+'-speed').val('').change(function() {
//			if(!isNaN($(this).val()) && $(this).val()>=0){
//				$(this).css('border-color', 'initial');
//				this_.tripWidget.module.errMsg.remove($(this));
//				this_.tripWidget.inputChanged({
//					truck_speed : $(this).val(),
//				});
//			}
//        });
		$('#'+this.id+'-capacityTrain').val('200').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					capacity_train : $(this).val(),
				});
			}
        });
		$('#'+this.id+'-capacityShip').val('1000').change(function() {
			if(!isNaN($(this).val()) && $(this).val()>=0){
				$(this).css('border-color', 'initial');
				this_.tripWidget.module.errMsg.remove($(this));
				this_.tripWidget.inputChanged({
					capacity_ship : $(this).val(),
				});
			}
        });
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


//Shuai (20-02-2018)
//options group
otp.widgets.tripoptions.Group =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	optionsWidget: null,
	widgets : [],
		
	initialize : function(tripWidget) {
		 var this_ = this;
		 console.log(arguments);
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id + "-Group-" + arguments[1];
	     this.optionsWidget = tripWidget;
	     
	     ich['otp-tripOptions-group']({
	    	 widgetId : this.id,
	    	 title: arguments[1],
	     }).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		$('#' + this.id + '-button').button().css('width', '100%').click(function(){
			if($('#' + this_.id + '-content').css('display') == 'none'){
				$('#' + this_.id + '-content').css('display', 'block');
				$($('#' + this_.id + '-title img')[0]).attr('src', 'images/down-arrow.png');
			}
			else{
				$('#' + this_.id + '-content').css('display', 'none');
				$($('#' + this_.id + '-title img')[0]).attr('src', 'images/play-button.png');
			}
		});
	},
	
	setWidgets: function(){
		var container = $('#' + this.id + '-content');
//		console.log(container);
		for(var i=0; i < this.widgets.length; i++){
//			console.log(this.widgets[i].$());
			container.append($('<div style="height: '+this.controlPadding+';"></div>'));
	        container.append(this.widgets[i].$());
	        this.widgets[i].doAfterLayout();
		}
	},
	
	addWidgets: function(widget){
		this.widgets.push(widget);
	},
	
	controlPadding : "8px",
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});


otp.widgets.tripoptions.AdvancedGroup = otp.Class(otp.widgets.tripoptions.Group, {
	
	id : null,
	optionsWidget: null,
	widgets : [],
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.Group.prototype.initialize.apply(this, [tripWidget, 'Advanced']);
	},
	
	doAfterLayout : function(){
		var this_ = this;
		otp.widgets.tripoptions.Group.prototype.doAfterLayout.apply(this, arguments);
	},
});


otp.widgets.tripoptions.ConfigurationGroup = otp.Class(otp.widgets.tripoptions.Group, {
	
	id : null,
	optionsWidget: null,
	widgets : [],
		
	initialize : function(tripWidget, title) {
		 var this_ = this;
	     otp.widgets.tripoptions.Group.prototype.initialize.apply(this, [tripWidget, 'Configuration']);
	},
	
	doAfterLayout : function(){
		var this_ = this;
		otp.widgets.tripoptions.Group.prototype.doAfterLayout.apply(this, arguments);
	},
});


otp.widgets.tripoptions.RiskGroup = otp.Class(otp.widgets.tripoptions.Group, {
	
	id : null,
	optionsWidget: null,
	widgets : [],
		
	initialize : function(tripWidget, title) {
		 var this_ = this;
	     otp.widgets.tripoptions.Group.prototype.initialize.apply(this, [tripWidget, 'Risk']);
	},
	
	doAfterLayout : function(){
		var this_ = this;
		otp.widgets.tripoptions.Group.prototype.doAfterLayout.apply(this, arguments);
	},
});


otp.widgets.tripoptions.errMsg = otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
	optionsWidget: null,
	binding: null,
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id + "-errMsg";
	     this.optionsWidget = tripWidget;
	     
	     var content = ich['otp-tripOptions-errMsg']({
	    	 widgetId : this.id,
	     }).appendTo(this.$());
	},
	
	setText: function(text){
		$('#' + this.id + '-text').html(text);
	},
	
	setBinding: function(div){
		this.binding = div;
	},
	
	remove: function(div){
//		console.log(div[0].id);
//		console.log(this.binding[0].id);
		if(this.binding && this.binding[0].id == div[0].id)
			this.$().remove();
	},
});


//Shuai (13-07-2018)
//widget for enable/disable driver rest time
otp.widgets.tripoptions.driverRestTimeWidget =
	otp.Class(otp.widgets.tripoptions.TripOptionsWidgetControl, {
	
	id : null,
		
	initialize : function(tripWidget) {
		 var this_ = this;
	     otp.widgets.tripoptions.TripOptionsWidgetControl.prototype.initialize.apply(this, arguments);
	     this.id = tripWidget.id+"-driverRestTimeWidget";
	     
	     var html = '<span class="notDraggable">';
	     html += '<text>Driver Rest Time:  </text></span>';
	     html += '<input id="' + this.id + '-checkbox" type="checkbox"/>'
	     $(html).appendTo(this.$());
	},
	
	doAfterLayout : function(){
		var this_ = this;
		
		$('#' + this.id + '-checkbox').change(function(){
			if(this.checked)
				this_.tripWidget.module.driverRestTime = true;
			else
				this_.tripWidget.module.driverRestTime = false;
		});
	},
	
	isApplicableForMode : function(mode) {
	    return otp.util.Itin.includesTransit(mode);
	}
});
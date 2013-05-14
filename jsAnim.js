/*!
	jsAnim: Powerful javascript animation
	--------------------------------------------
	Copyright 2009 Kevin Dolan
	-http://www.thekevindolan.com
	
	Code licensed under the MIT license
	-See license.txt
	
	v0.2
*/

//These vars are used to hold all jsAnimManagers
var jsAnimManagers = new Array();
var jsAnimManagerId = 0;

/*! public, accessible
	jsAnimManager object constructor
	Used by end-user to manage jsAnim objects
	Params:
		-[timestep] : time between frames, defaults to 40
*/
function jsAnimManager(timestep) {

	jsAnimManagers[jsAnimManagerId] = this;
	this.myId = jsAnimManagerId;
	jsAnimManagerId++;

	if(timestep)
		this.timestep = timestep;
	else	
		this.timestep = 40;
	
	this.paused = false;
	
	this.animObjects = new Array();
	this.index = 0;
	
	//Used internally to process a single frame of all active animations
	this.step = function() {
		if(!this.paused) {
			for(x in this.animObjects) {
				this.animObjects[x].step();
			}
			setTimeout("jsAnimManagers["+this.myId+"].step()",this.timestep);
		}
	};
	
	//Used internally to kill a jsAnimObject
	this.kill = function(id) {
		delete this.animObjects[id];
	};
	
	/*! public
		Called to create a new animation object
		Params:
			-objId : id of object being controlled
	*/
	this.createAnimObject = function(objId) {
		var el = document.getElementById(objId);
		var id = this.index;
		this.animObjects[id] = new jsAnimObject(el, id, this);
		this.index++;
		return this.animObjects[id];
	};
	
	/*! public
		Called to pause the animation manager
	*/
	this.pause = function() {
		this.paused = true;
	};
	
	/*! public
		Called to unpause the animation manager
	*/
	this.resume = function() {
		this.paused = false;
		this.step();
	};
	
	/*! public
		Called to set the appropriate style values to allow position to be controlled by jsAnim
		Params:
			-objId : id of object to be registered
			-[fixed] : fixed positioning, false to absolute fixed, defaults to false
	*/
	this.registerPosition = function(objId, fixed) {
		var el = document.getElementById(objId);
		var width = el.offsetWidth;
		var height = el.offsetHeight;
		
		if(fixed)
			el.style.position = "fixed";
		else
			el.style.position = "absolute";
		
		el.style.top = "0px";
		el.style.left = "50%";
		el.halfWidth = Math.floor(width/2);
		el.halfHeight = Math.floor(height/2);
		el.style.marginLeft = (-el.halfWidth)+"px";
		el.style.marginTop = (-el.halfHeight)+"px";
		
		el.positionRegistered = true;
		
		/*! public
			Called to manually set the position of this object
		*/
		el.setPosition = function(x, y) {
			this.style.marginLeft = (x - this.halfWidth)+"px";
			this.style.marginTop = (y - this.halfHeight)+"px";
		};
		
	};
	
	this.step();
	return true;
}

/*! accesible
	jsAnimObject object constructor
	Used internally to hold the state of a single animation manager
	Params:
		-obj : object being animated
		
*/
function jsAnimObject(obj, id, manager) {
	
	this.id = id;
	this.obj = obj;
	this.paused = false;
	this.animEntries = new Array();
	this.animLoops = new Array();
	this.current = 0;
	this.manager = manager;
	
	this.step = function() {
		if(!this.paused) {
			//Ugly code to get only the first element in the array
			for(x in this.animEntries) {
				var finished = this.animEntries[x].step();
				if(finished) {
					this.animLoops[x]--;
					this.animEntries[x].current = 0;
					this.animEntries[x].onLoop();
				}
				if(this.animLoops[x] == 0) {
					this.animEntries[x].onComplete();
					delete this.animEntries[x];
				}
				break;
			}
		}
	};
	
	/*! public
		Called to add an animation to the chain
		Params:
			-params : a collection in the containing the following elements
				- property : the Prop object to animate
				- [from] : optional from value, if unspecified current value is used
				- to : the value to animate to
				- duration : the length of time this animation should take
				- [ease] : the jsAnimEase object to use, if unspecified linear will be used
				- [loop] : the number of times to loop the animation, negative values are infinite, if unspecified 1 will be used
				- [onLoop] : the callback function for loop completion
				- [onComplete] : the callback function for animation completion
	*/
	this.add = function(params) {
		
		var property = params.property;
		var from = params.from
		var to = params.to;
		var duration = params.duration;
		if(params.ease)
			var ease = params.ease;
		else
			var ease = jsAnimEase.linear;
		if(params.loop)
			var loop = params.loop;
		else
			var loop = 1;
		if(params.onLoop)
			var onLoop = params.onLoop;
		else
			var onLoop = function() {};
		if(params.onComplete)
			var onComplete = params.onComplete;
		else
			var onComplete = function() {};
			
		this.animEntries[this.current] = new jsAnimEntry(this.obj, property, from, to, duration, this.manager.timestep, ease, onLoop, onComplete);
		this.animLoops[this.current] = loop;
		
		this.current++;
		
	};
	
	/*! public
		Called to skip the current animation, can be used to exit an infinite loop
	*/
	this.skip = function() {
		//Ugly code to get only the first element in the array
		for(x in this.animEntries) {
			delete this.animEntries[x];
			break;
		}
	};
	
	/*! public
		Called to pause this animator
	*/
	this.pause = function() {
		this.paused = true;
	};
	
	/*! public
		Called to resum this animator
	*/
	this.resume = function() {
		this.paused = false;
	};
	
	/*! public
		Called to kill this animator
	*/
	this.kill = function() {
		this.manager.kill(this.id);
	};
	
	return true;
}

/*! public, accesible
	Pos object constructor
	Called to store an x and y coordinate representing an object's center
		according to the jsAnim coordinate system
	Params:
		-x : x coordinate, 0 is center, negative is left, positive is right
		-y : y coordinate, 0 is top, positive id below
*/
function Pos(x, y) {
	
	//public
	this.x = x;
	
	//public
	this.y = y;
	
	return true;
}

/*! public, accesible
	Dim object constructor
	Called to store a width/height dimension
	Params:
		-w : width
		-h : height
*/
function Dim(w, h) {
	
	//public
	this.w = w;
	
	//public
	this.h = h;
	
	return true;
}

/*! public, accesible
	Col object constructor
	Called to store an RGB color
	Params:
		-r : red value (0,255)
		-g : green value (0,255)
		-b : blue value (0,255)
*/
function Col(r, g, b) {
	
	//public
	this.r = r;
	
	//public
	this.g = g;
	
	//public
	this.b = b;
	
	return true;
}

/*! 
	jsAnimEntry object constructor
	Used internally to hold the state of single animation entry
	Params:
		-property : jsAnimProp object
		-from : initial value
		-to : end value
		-duration : total time of animation (ms)
		-ease : jsAnimEase object
		-timestep : the timestep value of the animation manager
		-onLoop : called after each loop
		-onComplete : called after completion
*/
function jsAnimEntry(obj, property, from, to, duration, timestep, ease, onLoop, onComplete) {
	
	this.obj = obj;
	this.property = property;
	this.from = from;
	this.to = to;
	this.duration = duration;
	this.timestep = timestep;
	this.ease = ease;
	this.current = 0;
	this.onLoop = onLoop;
	this.onComplete = onComplete;
	
	/*!
		Used internally to move the object one step
		Returns : true if this anim entry has completed, false otherwise
	*/
	this.step = function() {
		if(!this.from)
			this.from = this.property.current(this.obj);
	
		if(this.current >= this.duration) {
			var p = this.ease.transform(1);
			this.property.update(this.obj, this.from, this.to, p);
			return true;
		}
		else {
			var t = this.current / this.duration;
			var p = this.ease.transform(t);
			this.property.update(this.obj, this.from, this.to, p);
			this.current += this.timestep;
			return false;
		}
	};
	
	return true;
}

/*! public
	jsAnimEase objects
	Used to control easing
	Methods:
		transform : Transform a number 0-1 representing a time proportion
			to a new number 0-1 representing a progress proportion 
*/
var jsAnimEase = {
	
	/*!public
		Constant Rate
	*/
	linear : {
		transform : function(t) {
			return t;
		}
	},
	
	/*!public
		Starts slow, then speeds up
	*/
	parabolicPos : {
		transform : function(t) {
			return t * t;
		}
	},
	
	/*!public
		Starts fast, then slows down
	*/
	parabolicNeg : {
		transform : function(t) {
			return 1 - (t-1) * (t-1);
		}
	},
	
	/*!public
		Overshoots target then returns to target
		Params:
			-g : overshoot amount [0-1]
	*/
	backout : function(g) {
		return {
			transform : function(t) {
				return (-1 * t * (t + g - 2)) / (1 - g);
			}
		};
	},
	
	/*!public
		Backs up a bit then moves to target
		Params:
			-g : backup amount [0-1]
	*/
	backin : function(g) {
		return {
			transform : function(t) {
				return 1 + ((t+1-g) * ((t+1-g) + g - 2)) / (1 - g);
			}
		};
	},
	
	/*!public
		Goes to target and then back at constant rate
	*/
	bounceLinear : {
		transform : function(t) {
			if(t < 0.5)
				return 2 * t;
			else
				return 1 - 2 * (t - 0.5)
		}
	},
	
	/*!public
		Goes to target and then back at variable rate
	*/
	bounceParabolic : {
		transform : function(t) {
			return -4 * t * (t-1);
		}
	},
	
	/*!public
		Goes to target and then back smoothly
	*/
	bounceSmooth : {
		transform : function(t) {
			return 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
		}
	}
}

/*!
	Utility objects for internal use
*/
var jsAnimUtil = {

	interp : function (v1, v2, percent) {
		if(isNaN(v1))
			v1 = 0;
		if(isNaN(v2))
			v2 = 0;
		var v =  v1 + percent * (v2-v1);
		return Math.floor(v);
	},
	
	getCSS : function (elem, field) {
		var css = document.defaultView && document.defaultView.getComputedStyle ?
			document.defaultView.getComputedStyle(elem, null)
			: elem.currentStyle || elem.style;
		return css[field];
	},
	
	explode : function ( delimiter, string, limit ) {
		// http://kevin.vanzonneveld.net
		// +     original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +     improved by: kenneth
		// +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +     improved by: d3x
		// +     bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// *     example 1: explode(' ', 'Kevin van Zonneveld');
		// *     returns 1: {0: 'Kevin', 1: 'van', 2: 'Zonneveld'}
		// *     example 2: explode('=', 'a=bc=d', 2);
		// *     returns 2: ['a', 'bc=d']
	 
		var emptyArray = { 0: '' };
		
		// third argument is not required
		if ( arguments.length < 2 ||
			typeof arguments[0] == 'undefined' ||
			typeof arguments[1] == 'undefined' )
		{
			return null;
		}
	 
		if ( delimiter === '' ||
			delimiter === false ||
			delimiter === null )
		{
			return false;
		}
	 
		if ( typeof delimiter == 'function' ||
			typeof delimiter == 'object' ||
			typeof string == 'function' ||
			typeof string == 'object' )
		{
			return emptyArray;
		}
	 
		if ( delimiter === true ) {
			delimiter = '1';
		}
		
		if (!limit) {
			return string.toString().split(delimiter.toString());
		} else {
			// support for limit argument
			var splitted = string.toString().split(delimiter.toString());
			var partA = splitted.splice(0, limit - 1);
			var partB = splitted.join(delimiter.toString());
			partA.push(partB);
			return partA;
		}
	}
}

/*! public
	Prop objects
	Used to keep track of which property is being controlled
	Methods:
		update : update the property to where it should be at the given time
		current : return a natural representation of the current property
*/
var Prop = {
	/*! public
		Wait, while doing no animating
	*/
	wait : {
		update : function(obj, from, to, percent) {},
		current : function(obj) {return 0;}
	},

	/*! public
		Follows a linear path
	*/
	position : {
		update : function(obj, from, to, percent) {
			var x = jsAnimUtil.interp(from.x, to.x, percent);
			var y = jsAnimUtil.interp(from.y, to.y, percent);
			
			obj.setPosition(x, y);
		},
		
		current : function(obj) {
			var left = parseInt(obj.style.marginLeft);
			var top = parseInt(obj.style.marginTop);
			var x = left + obj.halfWidth;
			var y = top + obj.halfHeight;
			return new Pos(x,y);
		}
	},
	
	/*! public
		Follows a semicircular path
		Params:
			-clockwise : True for clockwise, false otherwise
	*/
	positionSemicircle : function(clockwise) { 
		return {
			update : function(obj, from, to, percent) {
				var centerX = (from.x + to.x) / 2;
				var centerY = (from.y + to.y) / 2;
				
				var h = centerY - from.y;
				var w = from.x - centerX;
				
				var dist = Math.sqrt(h * h + w * w);
				
				if(w == 0) {
					if(h > 0)
						var initAngle = - Math.PI / 2;
					else
						var initAngle = Math.PI / 2;
				}
				else {
					var atan = Math.atan(h / Math.abs(w));
					if(w > 0)
						var initAngle = atan;
					else {
						var initAngle = Math.PI - atan;
					}
				}
				
				if(clockwise)
					var addAngle = - percent * Math.PI;
				else
					var addAngle = percent * Math.PI;	
					
				var angle = initAngle + addAngle;
				
				var x = Math.floor(centerX + dist * Math.cos(angle));
				var y = Math.floor(centerY - dist * Math.sin(angle));
				
				obj.setPosition(x, y);
			},
			
			current : function(obj) {
				var left = parseInt(obj.style.marginLeft);
				var top = parseInt(obj.style.marginTop);
				var x = left + obj.halfWidth;
				var y = top + obj.halfHeight;
				return new Pos(x,y);
			}
		}
	},
	
	/*! public
		Follows a circular path through target then back to start
		Params:
			-clockwise : True for clockwise, false otherwise
	*/
	positionCircle : function(clockwise) { 
		return {
			update : function(obj, from, to, percent) {
				var centerX = (from.x + to.x) / 2;
				var centerY = (from.y + to.y) / 2;
				
				var h = centerY - from.y;
				var w = from.x - centerX;
				
				var dist = Math.sqrt(h * h + w * w);
				
				if(w == 0) {
					if(h > 0)
						var initAngle = - Math.PI / 2;
					else
						var initAngle = Math.PI / 2;
				}
				else {
					var atan = Math.atan(h / Math.abs(w));
					if(w > 0)
						var initAngle = atan;
					else {
						var initAngle = Math.PI - atan;
					}
				}
				
				if(clockwise)
					var addAngle = 2 * percent * Math.PI;
				else
					var addAngle = -2 * percent * Math.PI;	
					
				var angle = initAngle + addAngle;
				
				var x = Math.floor(centerX + dist * Math.cos(angle));
				var y = Math.floor(centerY + dist * Math.sin(angle));
				
				obj.setPosition(x, y);
			},
			
			current : function(obj) {
				var left = parseInt(obj.style.marginLeft);
				var top = parseInt(obj.style.marginTop);
				var x = left + obj.halfWidth;
				var y = top + obj.halfHeight;
				return new Pos(x,y);
			}
		}
	},
	
	//public
	top : {
		update : function(obj, from, to, percent)  {
			obj.style.top = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'top'));
		}
		
	},
	
	//public
	right : {
		update : function(obj, from, to, percent)  {
			obj.style.right = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'right'));
		}
	},
	
	//public
	bottom : {
		update : function(obj, from, to, percent)  {
			obj.style.bottom = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'bottom'));
		}
	},
	
	//public
	left : {
		update : function(obj, from, to, percent)  {
			obj.style.left = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'left'));
		}
	},
	
	//public
	margin : {
		update : function(obj, from, to, percent)  {
			obj.style.margin = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'margin'));
		}
	},
	
	//public
	marginTop : {
		update : function(obj, from, to, percent)  {
			obj.style.marginTop = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'marginTop'));
		}
	},
	
	//public
	marginRight : {
		update : function(obj, from, to, percent)  {
			obj.style.marginRight = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'marginRight'));
		}
	},
	
	//public
	marginBottom : {
		update : function(obj, from, to, percent)  {
			obj.style.marginBottom = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'marginBottom'));
		}
	},
	
	//public
	marginLeft : {
		update : function(obj, from, to, percent)  {
			obj.style.marginLeft = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'marginLeft'));
		}
	},
	
	//public
	padding : {
		update : function(obj, from, to, percent)  {
			obj.style.padding = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'padding'));
		}
	},
	
	//public
	paddingTop : {
		update : function(obj, from, to, percent)  {
			obj.style.paddingTop = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'paddingTop'));
		}
	},
	
	//public
	paddingRight : {
		update : function(obj, from, to, percent)  {
			obj.style.paddingRight = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'paddingRight'));
		}
	},
	
	//public
	paddingBottom : {
		update : function(obj, from, to, percent)  {
			obj.style.paddingBottom = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'paddingBottom'));
		}
	},
	
	//public
	paddingLeft : {
		update : function(obj, from, to, percent)  {
			obj.style.paddingLeft = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'paddingLeft'));
		}
	},
	
	//public
	borderWidth : {
		update : function(obj, from, to, percent)  {
			obj.style.borderWidth = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'borderWidth'));
		}
	},
	
	//public
	borderTopWidth : {
		update : function(obj, from, to, percent)  {
			obj.style.borderTopWidth = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'borderTopWidth'));
		}
	},
	
	//public
	borderRightWidth : {
		update : function(obj, from, to, percent)  {
			obj.style.borderRightWidth = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'borderRightWidth'));
		}
	},
	
	//public
	borderBottomWidth : {
		update : function(obj, from, to, percent)  {
			obj.style.borderBottomWidth = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'borderBottomWidth'));
		}
	},
	
	//public
	borderLeftWidth : {
		update : function(obj, from, to, percent)  {
			obj.style.borderLeftWidth = jsAnimUtil.interp(from, to, percent) + "px";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'borderLeftWidth'));
		}
	},
	
	//public
	fontSize : {
		update : function(obj, from, to, percent)  {
			obj.style.fontSize = jsAnimUtil.interp(from, to, percent) + "pt";
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'fontSize'));
		}
	},
	
	//public
	height : {
		update : function(obj, from, to, percent)  {
			var v = jsAnimUtil.interp(from, to, percent);
			
			obj.style.height = v + "px";
			
			//Update the position if registered
			if(obj.positionRegistered) {
				var y = parseInt(obj.style.marginTop) + obj.halfHeight;
				obj.halfHeight = Math.floor(obj.offsetHeight/2);
				obj.style.marginTop = y - obj.halfHeight + "px";
			}
		},
		
		current : function(obj) {
			var ht = jsAnimUtil.getCSS(obj, 'height');
			if(ht == "auto")
				return obj.offsetHeight;
			else
				return parseInt(ht);
		}
	},
	
	//public
	width : {
		update : function(obj, from, to, percent)  {
			var v = jsAnimUtil.interp(from, to, percent);
			
			obj.style.width = v + "px";
			
			//Update the position if registered
			if(obj.positionRegistered) {
				var x = parseInt(obj.style.marginLeft) + obj.halfWidth;
				obj.halfWidth = Math.floor(obj.offsetWidth/2);
				obj.style.marginLeft = x - obj.halfWidth + "px";
			}
		},
		
		current : function(obj) {
			return parseInt(jsAnimUtil.getCSS(obj, 'width'));
		}
	},
	
	//public
	dimension : {
		update : function(obj, from, to, percent)  {
			var h = jsAnimUtil.interp(from.h, to.h, percent);
			var w = jsAnimUtil.interp(from.w, to.w, percent);
			
			obj.style.height = h + "px";
			obj.style.width = w + "px";
			
			//Update the position if registered
			if(obj.positionRegistered) {
				var y = parseInt(obj.style.marginTop) + obj.halfHeight;
				obj.halfHeight = Math.floor(obj.offsetHeight/2);
				obj.style.marginTop = (y - obj.halfHeight) + "px";
			
				var x = parseInt(obj.style.marginLeft) + obj.halfWidth;
				obj.halfWidth = Math.floor(obj.offsetWidth/2);
				obj.style.marginLeft = (x - obj.halfWidth) + "px";
			}
		},
		
		current : function(obj) {
			var ht = jsAnimUtil.getCSS(obj, 'height');
			if(ht == "auto")
				var h = obj.offsetHeight;
			else
				var h = parseInt(ht);
			var w = parseInt(jsAnimUtil.getCSS(obj, 'width'));
			return new Dim(w, h);
		}
	},
	
	//public
	color : {
		update : function(obj, from, to, percent)  {
			r = jsAnimUtil.interp(from.r, to.r, percent);
			g = jsAnimUtil.interp(from.g, to.g, percent);
			b = jsAnimUtil.interp(from.b, to.b, percent);
			
			obj.style.color = "rgb("+r+","+g+","+b+")";
		},
		
		current : function(obj) {
			var color = jsAnimUtil.getCSS(obj, 'color');
			color = color.substring(4,color.length-1);
			var rgb = jsAnimUtil.explode(",",color);
			return new Col(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
		}
	},
	
	//public
	backgroundColor : {
		update : function(obj, from, to, percent)  {
			r = jsAnimUtil.interp(from.r, to.r, percent);
			g = jsAnimUtil.interp(from.g, to.g, percent);
			b = jsAnimUtil.interp(from.b, to.b, percent);

			obj.style.backgroundColor = "rgb("+r+","+g+","+b+")";
		},
		
		current : function(obj) {
			var color = jsAnimUtil.getCSS(obj, 'backgroundColor');
			color = color.substring(4,color.length-1);
			var rgb = jsAnimUtil.explode(",",color);
			
			return new Col(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
		}
	},
	
	//public
	borderColor : {
		update : function(obj, from, to, percent)  {
			r = jsAnimUtil.interp(from.r, to.r, percent);
			g = jsAnimUtil.interp(from.g, to.g, percent);
			b = jsAnimUtil.interp(from.b, to.b, percent);
			
			obj.style.borderColor = "rgb("+r+","+g+","+b+")";
		},
		
		current : function(obj) {
			var color = jsAnimUtil.getCSS(obj, 'borderColor');
			color = color.substring(4,color.length-1);
			var rgb = jsAnimUtil.explode(",",color);
			return new Col(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
		}
	},
	
	//public
	opacity : {
		update : function(obj, from, to, percent)  {
			v = jsAnimUtil.interp(100*from, 100*to, percent);			
			obj.style.opacity = v / 100;
		},
		
		current : function(obj) {
			return jsAnimUtil.getCSS(obj, 'opacity');
		}
	}
}
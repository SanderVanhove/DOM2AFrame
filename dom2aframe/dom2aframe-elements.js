//Is true if the user is grabbing the canvas
var grabbing = false;

//The id for elements
var element_id = 0;

var d = new Date();

//Class to represent a position
class Position{
    constructor(){
        this.vector = [0,0,0,1];

        this.width = 0;
        this.height = 0;
    }

    copyPosition(pos, elem){
        this.vector[0] = Number(pos.left);
    	this.vector[1] = Number(pos.top);

    	//clientWidth/Height give the real width and height, pos.width/height give the width and height of the element when we put a box around it (takes transformations in account)
        this.width = elem.clientWidth;
        if(this.width == 0)
        	this.width = pos.width;
        this.height = elem.clientHeight;
        if(this.height == 0)
        	this.height = pos.height;

        this.html_width = pos.width;
        this.html_height = pos.height;
    }
}

//Represents a transformation (repositioning, scaling and rotation)
class TransformationManager{
	constructor(){
		this.position = [0,0,0];

		this.rotation = [0,0,0];

		this.scale = [1,1];
	}

	setPosition(x,y,z){
		this.position = [Number(x),Number(y),Number(z)];
	}

	setScale(x,y){
		this.scale = [Number(x),Number(y)];
	}

	setRotate(x,y,z){
		this.rotation = [Number(x),Number(y),Number(z)];
	}
}

//Basis of an element
class Element{
	constructor(domelement){
		this.domelement = domelement;
		
		//Make sure dom elements can tell theyr children to update
		this.domelement.setSubtreeDirty = () => { this.setSubtreeDirty(); };
		this.aelement = null;

        //Listenes for direct css changes
		(new MutationObserver(this.checkIfDirty.bind(this))).observe(this.domelement, { attributes: true, childList: true, characterData: true, subtree: false, attributeOldValue : true });

        //Listenes for css animations
        this.domelement.addEventListener("animationstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("animationend", this.stopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge
        this.domelement.addEventListener("transitionstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("transitionend", this.stopAnimation.bind(this));

        this.transformation = new TransformationManager();

        this.is_transparant = false;

        //This gets checked to see if we need to separate the element or re-attach it to its parent
        this.was_separate = false;

        //Flag for when we need to redraw
        this.dirty = true;

        this.is_body = this.domelement.tagName === "BODY";
	}

	//Sets the id of the element
	setId(){
		if(this.domelement.hasAttribute("vr-id"))
			this.id = this.domelement.getAttribute("vr-id");
		else
			this.id = "ge_"+ (++element_id);
		this.aelement.setAttribute("id",this.id);

		if(this.domelement.hasAttribute("vr-class"))
			this.aelement.setAttribute("class",this.domelement.getAttribute("vr-class"));

		this.aelement.domelement = this.domelement;
		this.domelement.aelement = this.aelement;
	}

	//Returns true if attribute existes and the functionality can be used
	copyAttribute(attr){
		if(this.domelement.hasAttribute(attr)){
			this.aelement[attr] = this.domelement[attr].bind(this.domelement);
			return true;
		}
	}

	//Adds all javascript functionality to the objects
	addFunctionality(){
		var is_clickable;
		//Some standard operations
		is_clickable = this.copyAttribute('onclick');
		is_clickable = this.copyAttribute('onmousedown') || is_clickable;
		is_clickable = this.copyAttribute('onmouseenter') || is_clickable;
		is_clickable = this.copyAttribute('onmouseleave') || is_clickable;
		is_clickable = this.copyAttribute('onmouseup') || is_clickable;

		//Video specific functionality

		//The show-player attribute shows the media player when the element is clicked
		if(this.domelement.hasAttribute("show-player")){
			this.aelement.onclick = function(){ dom2aframe.showVideoPlayer(); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
			is_clickable = true;
		}

		//The play-video attribute shows the media player with a new video, that is specified by the attribute, when the element is clicked
		if(this.domelement.hasAttribute("play-video")){
			//Create video asset
			var video_id = asset_manager.GetAsset(this.domelement.getAttribute("play-video"), "video");
			this.aelement.onclick = function(){ dom2aframe.showNewVideo(video_id); if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); }
			is_clickable = true;
		}

		//The hover attribute adds the class that is specified in the attribute to the element when the cursor enters it and removes it when the cursor leves
		if(this.domelement.hasAttribute("hover")){

			this.aelement.hover = function() {
				//The class gets added to the dom element
				this.domelement.classList.add(this.domelement.getAttribute("hover"));
			};

			this.aelement.stopHover = function() {
				//The class gets removed from the dom element
				this.domelement.classList.remove(this.domelement.getAttribute("hover"));
			};

			//Add lambda functions so we can use "this"
			this.aelement.onmouseenter = ()=>{ this.aelement.hover(); if(this.domelement.onmouseenter) this.domelement.onmouseenter.call(this.domelement); };
			this.aelement.onmouseleave = ()=>{ this.aelement.stopHover(); if(this.domelement.onmouseleave) this.domelement.onmouseleave.call(this.domelement); };

			is_clickable = true;
		}

		if(this.domelement.hasAttribute("href")){
			this.aelement.onclick = function(){ window.location.href = this.domelement.getAttribute("href") + "?stayInVR=true";  if(this.domelement.onclick) this.domelement.onclick.call(this.domelement); };
			is_clickable = true;
		}

		if(is_clickable)
			this.aelement.classList.add('clickable');

		if(this.is_body){
			// Element resize detector, defined on the body to check when the body changes size
			// With the ultra fast scroll-based approach. 
			this.erd = elementResizeDetectorMaker({
			  strategy: "scroll"
			});

		    
		    this.erd.listenTo(this.domelement, (function(){ 
		    								var pos = new Position();
		    								pos.copyPosition(this.domelement.getBoundingClientRect(), this.domelement); 
		    								if(this.position.width != pos.width)
		    									this.setSubtreeDirty.bind(this);
		    							}).bind(this));
		}
	}

	//At the start of an animation, we want to start an interval to update this element every so often
    startAnimation(event){
    	//Stop the event from propagating to parent elements
    	event.stopPropagation();
    	log("Animation started");

        this.stopIntervall();
        this.updateAnimation();
        this.interval = setInterval(this.updateAnimation.bind(this), 1000/dom2aframe.animation_fps);
    }

    //Stop the animation and update one last time
    stopAnimation(){
    	//Stop the event from propagating to parent elements
    	event.stopPropagation();
    	log("Animation stopt");

        this.stopIntervall();
        this.updateAnimation();
    }

    //Stop the interval to update for an animation
    stopIntervall(){
        clearInterval(this.interval);            
    }

    //Update for one Animation frame
    updateAnimation(){
        this.setSubtreeDirty();
    }

    //Flaggs itself as dirty and recursively sets its direct children dirty
    setSubtreeDirty(){
    	this.setDirty();

    	var children = this.domelement.childNodes;
		for(var i = 0, len = children.length; i < len; i++)
			if(children[i].setSubtreeDirty)
				children[i].setSubtreeDirty();
    }

    //Sets the element dirty and flaggs that there is something dirty
    setDirty(){
    	this.dirty = true;
    	dom2aframe.somethingdirty = true;
    }

    isDirty(){
    	return this.dirty;
    }

    //Return the A-frame element
	getAElement(){
		return this.aelement;
	}

	//Return the dom element 
	getDomElement(){
		return this.domelement;
	}

	//Check if the event is triggered because of a grab
	SetDragEvent(element){
		//Only the body can be grabed, this is a container element
		if(!(element instanceof ContainerElement))
			return false;

		var dom_element = element.getDomElement();
		if(element.is_body && dom_element.classList.contains("a-grabbing") && !grabbing){ //If we are not grabbing and the class a-grabbing appears in the body we know we started grabbing
			grabbing = true;
			return true;
		}else if(element.is_body && !dom_element.classList.contains("a-grabbing") && grabbing){ //If we are grabbing and the a-grabbing class is gone, we know it is over, but we still have ignore the event
			grabbing = false;
			return true;
		}
		return false;
	}

    //Checks if the element should be flagged as dirty and if its children also should be flagged
    checkIfDirty(mutation, is_animating){
    	if(this.SetDragEvent(this) || !mutation)
    		return;

    	for(var i = 0; i < mutation.length; i++){
	    	//Check if the element just stayed the same as before
	        if(mutation[i].oldValue === this.domelement.getAttribute(mutation[i].attributeName))
	        	continue;

	    	//Check if the elements style and possibly the style of its children changed
	        if(mutation[i].type === "attributes" && (mutation[i].attributeName === "class" || mutation[i].attributeName === "style"))
	        	this.setSubtreeDirty();
	        else
	        	this.setDirty();
	    }
    }

    //Returns if an element is visible, el.offsetParent is null if a parent is invisible but the body always has a null value with this
	isNotHidden(style){
		return ((this.is_body || this.domelement.offsetParent !== null) && style.getPropertyValue("visibility") !== "hidden" && style.getPropertyValue("display") !== "none");
	}

	//Compares the position with its own position, returns true if they are the same
    comparePosition(position){
        return this.position.top == position.top && this.position.height == position.height && this.position.left == position.left && this.position.width == position.width && this.position.z == position.z;
    }

    //Get the value of the style, or 0 of it is null
    getStyleValue(name, computed_style){
    	return computed_style.getPropertyValue(name).trim();
    }

    //Extracts the 2D transformation (scale and rotation) from the transform matrix
    getCSSTransformation(computed_style){
    	var tr = computed_style.getPropertyValue("transform");

    	if(tr == "none")
    		return false;

		var values = tr.split('(')[1];
		if(values == undefined)
			return false;
		values = values.split(')')[0];
		values = values.split(',');

		var a = values[0];
		var b = values[1];

		this.CSSangle = -Math.round(Math.atan2(b, a) * (180/Math.PI));
		this.CSSscale = Math.sqrt(a*a + b*b);

		return true;
    }

    getTransormation(computed_style){
    	//Get the newest position data
    	this.updatePosition();

    	//Calculate special vr position
		var x = this.getStyleValue("--vr-x", computed_style);
		if(x == "null" && !this.is_separate)
			x = 0;
		else if(x == "null")
			x = this.position.vector[0];
		else if(!this.is_separate)
			x *= pixels_per_meter;
		else{
			x -= (this.position.width/pixels_per_meter)/2;
			x *= pixels_per_meter;
		}

		var y = this.getStyleValue("--vr-y", computed_style);
		if(y == "null" && !this.is_separate)
			y = 0;
		else if(y == "null")
			y = this.position.vector[1];
		else if(!this.is_separate)
			y *= pixels_per_meter;
		else{
			y -= (this.position.height/pixels_per_meter)/2;
			y *= pixels_per_meter;
		}

		var z = this.getStyleValue("--vr-z", computed_style);
		if(z == "null" && !this.is_separate)
			z = 0;
		else if(z == "null")
			z = this.position.vector[2];

		this.transformation.setPosition(x,y,z);

		//If there is a special vr scale deffined, use that
		var scale = computed_style.getPropertyValue("--vr-scale").trim();
		if(scale != "null"){
			scale = scale.split(" ");

			if(scale.length == 1)//If the user just gave one scale
				this.transformation.setScale(scale[0], scale[0]);
			else if(scale.length == 2)//If the user gave a scale for x and y separately
				this.transformation.setScale(scale[0], scale[1]); 
		}else
			this.transformation.setScale(1, 1); 

		//If there is a special vr scale deffined, use that
		var rotation = computed_style.getPropertyValue("--vr-rotate").trim();

		if(rotation != "null"){
			rotation = rotation.split(" ");

			this.transformation.setRotate(rotation[0], rotation[1], rotation[2]);
		}else
			this.transformation.setRotate(0, 0, 0);

		if(this.getCSSTransformation(computed_style)){

			this.transformation.scale[0] *= this.CSSscale;
			this.transformation.scale[1] *= this.CSSscale;

			//Add the angel to the already excisting angle
			this.transformation.rotation[2] += Number(this.CSSangle);

			//Because html calculates its bounding rect with the transformation in (the bounding rect gets bigger and the position is higher and more to the left), we have to account for that
			this.transformation.position[0] += (this.position.html_width - this.position.width)/2;
			this.transformation.position[1] += (this.position.html_height - this.position.height)/2;
		}

    }

    //Calc the position of the element relative to its parent
    updatePosition(){
	    this.position = new Position();
		this.position.copyPosition(this.domelement.getBoundingClientRect(), this.domelement);

	    if(this.is_separate)//The vr position is different from the page position if the element is separate
	    	this.vr_position = this.transformation.position;
	    else if(this.is_body){//The body should not take its parent in account 
	    	this.position.vector[0] -= this.position.width/2;
	    	this.vr_position = this.position.vector;
	    }else{
	    	var parent_position = this.domelement.parentElement.getBoundingClientRect();

			//Position the element relative to its parent and factoring the --vr-relative properties in
			this.position.vector[0] -= parent_position.left + parent_position.width/2 - this.transformation.position[0];
			this.position.vector[1] -= parent_position.top + parent_position.height/2 - this.transformation.position[1];
			this.position.vector[2] += this.transformation.position[2];

	    	this.vr_position = this.position.vector;
	    }
    }

    //Check if the element has any special css property
	checkIfSeparate(computed_style){
		var is_sep = computed_style.getPropertyValue("--vr-position");

		if(is_sep != "null")
			return is_sep.trim() == "absolute";
		
		return false;
	}

	//Remove the element from its parent when it just got separated, or add it back to its parent when it stops beeïn separated
	updateSeparated(){
		if(this.was_separate){
			this.was_separate = false;
			this.parent.appendChild(this.aelement);
		}else{
			this.was_separate = true;

			dom2aframe.a_element_container.appendChild(this.aelement);
		}
	}

	updateOpacity(element_style){
		//Set the opacity of the element
        var new_opacity = 0;

        //If the element is not hidden, we have to get the elements opacity
        var parent_op = this.domelement.parentElement.vr_opacity;
    	if(this.is_body || this.is_separate || typeof parent_op === "undefined")//If the parent has an opacity set, then the children can get max that opacity
    		new_opacity = element_style.getPropertyValue("opacity");
    	else
    		new_opacity = parent_op * element_style.getPropertyValue("opacity");

        //Now we set the opacity in the dom element so that we can get to it from its children
        this.domelement.vr_opacity = new_opacity;

        //If the element is transparant, the elements transparency is also set, this has to be after the vr_opacity is set on the dom element, else we get wrong readings
        if(this.is_transparant || !this.isNotHidden(element_style))
        	new_opacity = 0;

    	//this.aelement.setAttribute("opacity", "");
    	this.aelement.setAttribute("opacity", new_opacity);
	}

    //Generic update function
    update(){

        //Check if the element was flagged as dirty, this only happens when it's style may have changed
        if(this.isDirty()){
        	//Get the style of the elemtent, this is a heavy operation
	        var element_style = window.getComputedStyle(this.domelement);

	        //Check if is separated now
			this.is_separate = this.checkIfSeparate(element_style);

			if(this.is_separate != this.was_separate)//Check if the separate is still the same
				this.updateSeparated();

			this.getTransormation(element_style);

			//Apply the scale and rotation
	    	this.aelement.setAttribute("scale", {x:this.transformation.scale[0], y:this.transformation.scale[1], z:1});
	    	this.aelement.setAttribute("rotation", {x:this.transformation.rotation[0], y:this.transformation.rotation[1], z:this.transformation.rotation[2]});

	    	this.aelement.setAttribute("material","alphaTest: 0.5;");

	        //Let the element update its own style
	        this.elementSpecificUpdate(element_style);

	        this.updateOpacity(element_style);

	        this.dirty = false;
	    }

        //Cash the new position
        this.updatePosition();
        //Let the element update its own position
    	this.elementUpdatePosition();
    }
}

class TextElement extends Element{
	constructor(domelement, dontAddFunc){
		super(domelement);

		this.aelement = document.createElement("a-text");

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		//Calc the x and y possition
        var x = this.vr_position[0]/pixels_per_meter;
        var y = -(this.position.height / 2 + this.vr_position[1])/pixels_per_meter;

        this.aelement.setAttribute("position",{x: x, y: y, z: layer_difference + this.vr_position[2]});

        //The amount of pixels before it should wrap the text
        this.aelement.setAttribute("width",this.position.width/pixels_per_meter);
	}

	//Strips all tags from a string
	stripText(html){
	    var tmp = document.createElement("DIV");
	    tmp.innerHTML = html;
	    return tmp.textContent || tmp.innerText;
	}

	elementSpecificUpdate(element_style){
		//First reset the anchor to nothing and then back to left
		this.aelement.setAttribute("anchor","");
		this.aelement.setAttribute("anchor","left");

        //Get the text value of the element
        this.aelement.setAttribute("text","value: " + this.stripText(this.domelement.innerHTML) + ";");

        if(dom2aframe.transparent != element_style.getPropertyValue("color")){
			this.aelement.setAttribute('color', "");
	        this.aelement.setAttribute('color', element_style.getPropertyValue("color"));

	        this.aelement.setAttribute("side","");
	        this.aelement.setAttribute("side","double");
	        this.is_transparant = false;
	    }else{ //If the element is transparent we just don't show it
	    	this.is_transparant = true;
	    }

	    this.aelement.setAttribute("align","");
		this.aelement.setAttribute("align",element_style.getPropertyValue("text-align"));

	    this.aelement.setAttribute("wrap-count",0);
	    this.aelement.setAttribute("wrap-pixels",(this.position.width) / (parseFloat(element_style.getPropertyValue("font-size")) / 52));
	}
}

//Containers are everything that that is just a container for other elements (div, section, article,...)
class ContainerElement extends Element{
	constructor(domelement, depth, dontAddFunc){
		super(domelement, depth);

		this.aelement = document.createElement("a-plane");

		this.setId();

		if(!dontAddFunc)
			this.addFunctionality();
	}

	elementUpdatePosition(){
		this.width = this.position.width/pixels_per_meter;
		this.height = this.position.height/pixels_per_meter;

		//Calculate x and y position
		var x = this.vr_position[0]/pixels_per_meter + this.width/2;
		var y = -this.vr_position[1]/pixels_per_meter - this.height/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: layer_difference + this.vr_position[2]});

		this.aelement.setAttribute("width", this.width);
		this.aelement.setAttribute("height", this.height);
	}

	//Check if string s is a url
	isUrl(s) {
	   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	   return regexp.test(s);
	}

	elementSpecificUpdate(element_style){
		var background_color = element_style.getPropertyValue("background-color");
		//Get the background image
		var background_image = element_style.getPropertyValue("background-image");
		//Juse a regex to extract the url if it is there
		background_image = background_image.substring(background_image.lastIndexOf('(\"')+2,background_image.lastIndexOf('\")'));
		//If the background image is just "n" it means that there  was none
		if(background_image === "n")
			background_image = false;
	
		if(dom2aframe.transparent != background_color || background_image){ //Check if the element is not transparent or has a background image
			if(this.isUrl(background_image)){//Check if the path to the background image is a legitimate url
				this.aelement.setAttribute('material','');
				//Set the source to the right asset id and alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white
				this.aelement.setAttribute('material','alphaTest: 0.5; src: #' + asset_manager.GetAsset(background_image, "img"));
			} else //If the background just is a color
				this.aelement.setAttribute('color', background_color);

			//Set double sided so we can look at the element from behind
			this.aelement.setAttribute("side","");
			this.aelement.setAttribute("side","double");

			this.is_transparant = false;
		}else{ //If the element is transparent we just don't show it
			this.is_transparant = true;
		}
	}
}

//Image elements represent img dom elements
class ImageElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-image");
		//Set the source of the element, this is the id  of the image element in the a-asset tag
		this.aelement.setAttribute("src","#"+asset_manager.GetAsset(this.domelement.getAttribute("src"),"img"));
		//Set alphaTest on 0.5, this makes that if a PNG uses alpha, that alpha is respected and not just white

		this.setId();
		this.addFunctionality();
	}

	elementUpdatePosition(){
		//Calc with and height of the element
		var width = this.position.width/pixels_per_meter;
		var height = this.position.height/pixels_per_meter;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		//Calculate the x position
		var x = this.vr_position[0]/pixels_per_meter + width/2;
		//Calculate the y position
		var y = -this.vr_position[1]/pixels_per_meter - height/2;

		this.aelement.setAttribute('position', {x: x, y: y, z: layer_difference + this.vr_position[2]});
	}

	elementSpecificUpdate(element_style){
		this.aelement.setAttribute("src","#"+asset_manager.GetAsset(this.domelement.getAttribute("src"),"img"));
	}
}

//Text with background represents every element that contains pure text
class TextWithBackgroundElement extends Element{
	constructor(domelement){
		super(domelement);

		this.aelement = document.createElement("a-entity");
		this.aelement.setAttribute("side","double");

		//Make separate container and text element, only the container gets functionality
		this.aplane = new ContainerElement(domelement);
		this.atext = new TextElement(domelement, true);

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

		this.setId();
	}

	//Text with background is dirty when it or its children is dirty
	isDirty(){
		return this.aplane.isDirty() || this.atext.isDirty() || this.isdirty;
	}

	elementUpdatePosition(){
		this.aplane.elementUpdatePosition();
		this.atext.elementUpdatePosition();
	}

	elementSpecificUpdate(){
		this.aplane.update();
		this.atext.update();
	}
}
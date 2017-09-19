//Loggs when true
var debugging = true;

//The size of the CSS refference pixel times 10
var pixels_per_meter = 100/0.26;

//The depth difference between elements in meter
var layer_difference = 0.00015;

var text_elements = ["P","CAPTION","cite","B","CODE","I","A","BUTTON","SPAN","LABEL","STRONG","U","SUB","SUP","SUMMARY","SMALL","SAMP","EM","KBD","VAR","S","Q","PRE","MARK","INS","FIGCAPTION","DT","DL","DFN","DEL","DD","CAPTION","BLOCKQUOTE","ADDRESS","ADDR","TD","TH"];
var container_elements = ["BODY","DIV","SECTION","NAV","UL","LI","HEADER","FORM","INPUT","ARTICLE","TABLE","TR","TBODY","THEAD","TFOOT","PROGRESS","MAIN","HR","FOOTER","FIGURE","PICTURE","ASIDE"];

var dom2aframe;
var asset_manager;

//Log item when we want to debug
function log(item){
	if(debugging)
		console.log(item);
}

//Component to keep vr when linking
AFRAME.registerComponent('auto-enter-vr', {
  init: function () {
  	if(window.location.search.indexOf("stayInVR=true") !== -1)
    	this.el.sceneEl.enterVR();
  }
});

class Dom2Aframe{
	constructor(){
	    THREE.ImageUtils.crossOrigin = '';
	    //All the elements that represent dom elements
		this.a_elements = new Array();
		//The depth at which elemnts start to get placed
		this.layer_depth = 0;
		//We dynamicaly add elements that get added to the dom to our a-scene aswell, this should be turned off when using the A-frame inspector 
		this.dynamic_add_elements = true;

	    //The a-scene that will contain all A-frame code, we first try if there already exist an a-scene to build into that one
	    var a_scenes = document.getElementsByTagName("a-scene");

	    if(a_scenes.length > 0){
			this.a_scene = a_scenes[0];
			this.was_already_a_scene = true;

			//see if the a-scene is loaded
			if(this.a_scene.hasLoaded)
				this.initiate();
			else
				this.a_scene.addEventListener("loaded",  this.initiate.bind(this));
		}
		else{
			this.was_already_a_scene = false;
			this.a_scene = document.createElement("a-scene");
			this.initiate();
		}
	    
	}

	initiate(){
		this.a_scene.setAttribute("auto-enter-vr","true");
		//Append assets
	    asset_manager.addAssetsToScene(this.a_scene);

		//Camera
		this.camera = new Camera(body_width);
		this.a_scene.appendChild(this.camera.getAElement());

	    //Container for all the transcoded elements
	    this.a_element_container = document.createElement("a-entity");
	    this.a_element_container.setAttribute("id", "aElementContainer");
	    this.a_scene.appendChild(this.a_element_container);

		//Calculate the with of the body, this is used to calculate the camera position
		var body_position = document.body.getBoundingClientRect();
		var body_width = (body_position.right - body_position.left)/pixels_per_meter;


		//Amount of frames per second that animations should be updated with
		this.setAnimationFPS(25);

		this.calcTransparentValue();
	    this.initStyles();
		this.initControllerSupport();
		this.initVideoElement(body_width);
		this.initSky();
		
		//transcode the body
		this.createAllElements();


	    this.initEvents();

	    /*if(debugging)
	    	this.a_scene.setAttribute("stats", true);*/

	    //Append the a-scene to the body if there was none
	    if(!this.was_already_a_scene)
	    	document.body.appendChild(this.a_scene);

	    //Indicates that something was dirty and all other elements should check if they changed
		this.somethingdirty = false;

		this.startLoop();

		//this.a_scene.load();
	}

	startLoop(){
		if(debugging){
			this.start = performance.now();
			this.frames = 0;
		}
		//Start render loop
	    window.requestAnimationFrame(this.UpdateAll.bind(this));
	}

	//The style values for a transparent dom element
	//This can be different between browsers, that is why we should calculate it everytime we load the page
	calcTransparentValue(){
		//Getting the value for this browser that means transparent to know when an element is transparent
	    var trans_element = document.createElement("div");
		trans_element.setAttribute("style", "background:none;display:none;")
		//Add the element to the body because only then we can caluculate the style
	    document.body.appendChild(trans_element);
		this.transparent = window.getComputedStyle(trans_element).getPropertyValue("background-color");
		//Remove it again
		document.body.removeChild(trans_element);
	}

	initSky(){
		var a_sky = document.createElement("a-gradient-sky");
	    a_sky.setAttribute("material", "shader: gradient; topColor: 255 255 255; bottomColor: 10 10 10;");
	    this.a_scene.appendChild(a_sky);
	}

	initVideoElement(body_width){
		this.video_element = new VideoElement({x:0, y:-body_width/4, z:this.camera.getCameraDistance()});
	    this.a_scene.appendChild(this.video_element.GetElement());
	}

	initControllerSupport(){
		var controllers = new Controllers(this.camera);
		controllers.setPosition(this.camera.getPosition());

		this.a_scene.appendChild(controllers.aelement);
	}

	initEvents(){
		//Observer to check for newly added or deleted DOM elements
		var observer = new MutationObserver(this.HandleRemoveAddMutation.bind(this));
		observer.observe(document.body, {childList: true, subtree: true});

		//Events for when we enter and exit vr
		this.a_scene.addEventListener("enter-vr",this.enterVr.bind(this));
	    this.a_scene.addEventListener("exit-vr",this.exitVr.bind(this));

	    //Event to update when scrolling
	    window.onscroll = (function(){this.somethingdirty = true;}).bind(this);

	    //Add the key events
	    document.onkeydown = this.checkKey.bind(this);
	}

	initStyles(){
		//Inject css to get the VR button fixed and the a-scene on top of everything and defining the custom vr properties
	    this.vrcss = document.createElement('style');
	    this.vrcss.innerHTML = "*{--vr-x:null;--vr-y:null;--vr-z:null;--vr-scale:null;--vr-rotate:null;--vr-position:null;} .a-enter-vr{position: fixed;} .a-scene{position:fixed; top:0;} .a-html{ position: static; } .a-body{ height: initial; margin: 0px; overflow: initial; padding: initial; width: initial; }";
	    document.body.appendChild(this.vrcss);

	    //Style that changes when in vr
		this.invr_css = ".a-canvas{display: default; position: fixed; } a-scene{width: 100%; height: 100%;} *{user-select: none;}";
		this.outvr_css = ".a-canvas{display: none;} a-scene{width: auto; height: auto;}";
	    this.changing_style = document.createElement('style');
	    this.changing_style.innerHTML = this.outvr_css;
	    document.body.appendChild(this.changing_style);
	}

	//Looks at all the elements and updates them if they are dirty
	UpdateAll(){
		//Only update when something is dirty
	    if(this.somethingdirty){
	        log("Updating all Elements");

	    	for(var i = 0; i < this.a_elements.length; i++){
	    		this.a_elements[i].update();
	    	}

	        this.somethingdirty = false;
		}

		if(debugging){

			this.stop = performance.now();
			this.frames++;
			if(this.stop - this.start > 1000){
				log("AnimationFrames per second: "+this.frames);
				this.start = performance.now();
				this.frames = 0;
			}
		}

		//Loop back
		window.requestAnimationFrame(this.UpdateAll.bind(this));
	}

	elementIsInList(list, element_name){
		for(var i = 0; i < list.length; i++)
			if(list[i] == element_name)
				return true;

		return false;
	}

	AddNewElement(element){

		if(typeof  element.tagName === "undefined" || element.nodeName == "#text" || element.tagName.startsWith("A-") || element.added_to_a_scene)
			return;

		//Some random element gets spawned and deleted immediately after, I don't see where it comes from or what its purpose is, but it gives errors. Now they don't get added
		if(element.innerHTML == '<div classname="t" onsubmit="t" onchange="t" onfocusin="t" style="margin: 0px; border: 0px; box-sizing: content-box; width: 1px; padding: 1px; display: block; zoom: 1;"><div style="width: 5px;"></div></div>')
			return;
		
		log("New element:")
		log(element);
		var new_a_element = null;

		if(this.elementIsInList(container_elements, element.tagName)) //Container element
			new_a_element = new ContainerElement(element);
	    else if(this.elementIsInList(text_elements, element.tagName) || typeof element.tagName == "string" && element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1])){//Text based elements
	    	new_a_element = new TextWithBackgroundElement(element);
	    	//Because this element takes up 2 layers we increase the layer depth here
			this.layer_depth += layer_difference;
	    }else if(element.tagName == "IMG") //Images
	      new_a_element = new ImageElement(element);
	    
	    //Push the element in the array of all elements
	    if(new_a_element != null){
	    	this.a_elements.push(new_a_element);
	    	this.layer_depth += layer_difference;
	    }

	    element.added_to_a_scene = true;
	    return new_a_element;
	}

	//Adds the element and then recursively calls this function on its direct children
	AddNewNestedElement(element){
		var parent = this.AddNewElement(element);

		if(parent == null)
			return;

		var children = element.childNodes;
		for(var i = 0; i < children.length; i++){
			var child = this.AddNewNestedElement(children[i]);
			if(child != undefined){
				child.parent = parent.getAElement();
				parent.getAElement().appendChild(child.getAElement());
			}
		}

		return parent;
	}

	//Seeks and removes an element
	RemoveElement(removed_element){
		for(var i = 0; i < this.a_elements.length; i++){
			if(this.a_elements[i].getDomElement() == removed_element){
				log("Element removed:");
				log(this.a_elements[i]);

				if(this.a_elements[i].parent){
					this.a_elements[i].parent.removeChild(this.a_elements[i].getAElement());
				}

					this.a_elements.splice(i,1);
			}
		}
	}

	DynamicalyAddElement(added_node){
		var added_element = dom2aframe.AddNewNestedElement(added_node);

    	if(added_element != undefined && added_node.parentElement && added_node.parentElement.aelement){
        	added_node.parentElement.aelement.appendChild(added_element.getAElement());
        	added_element.parent = added_node.parentElement.aelement;
    	}
	}

	HandleRemoveAddMutation(mutations) {
	    mutations.forEach(
		    function(mutation) {
		    	if(dom2aframe.dynamic_add_elements){
			        for(var i = 0; i < mutation.addedNodes.length; i++){
			        	dom2aframe.DynamicalyAddElement(mutation.addedNodes[i]);
			            dom2aframe.somethingdirty = true;
			        }
			    }
		        for(var i = 0; i < mutation.removedNodes.length; i++){
		            dom2aframe.RemoveElement(mutation.removedNodes[i]);
		            dom2aframe.somethingdirty = true;
		        }
		    });
	}

	//Creates an element for every dom element that is present in the body and the body itself
	createAllElements(){
		var body = this.AddNewNestedElement(document.body).getAElement();

		log("Add body");
		log(this.camera.getAElement().hasLoaded);

		if(this.camera.getAElement().hasLoaded)
			this.a_element_container.appendChild(body);
		else
			this.camera.getAElement().addEventListener("loaded", (function(){
														    this.a_element_container.appendChild(body);
														}).bind(this) );
	}

	enterVr(){
	    this.changing_style.innerHTML = this.invr_css;
	    this.invr = true;
	}

	exitVr(){
	    this.changing_style.innerHTML = this.outvr_css;
	    this.invr = false;
	}

	//Controls 
	checkKey(e) {

	    e = e || window.event;

	    //press E or A to go up and down. 
	    //press P to show video
	    //press T to change video representation method
	    //press L to toggle moving
	    //press N to stop dynamicaly adding elements
	    //press O to show convas
	    //press M to toggle mouse as cursor
	    //press Ctrl + Alt + I to inspect

	    switch(e.keyCode){
	    case 65: //press E or A to go up and down. 
	    	var pos = this.camera.getPosition();
	        this.camera.setPosition({x:pos.x, y:(pos.y + 0.1), z: pos.z});
	        this.video_element.SetPosition(pos);
	    	break;

	    case 69: //press E or A to go up and down. 
	        var pos = this.camera.getPosition();
	        this.camera.setPosition({x:pos.x, y:(pos.y - 0.1), z: pos.z});
	        this.video_element.SetPosition(pos);
	        break;

	    case 84: //press T to change video representation method
	        this.video_element.ToggleMode();
	        break;

	    case 80: //press P to show video
	    	this.showVideoPlayer();
	    	break;

	    case 77: //press M to toggle mouse as cursor
	    	this.camera.toggleMouseCursor();
	    	break; 

	    case 76: //press L to toggle moving
	    	//getAttribute for "wasd-controls-enebled" is a string
	    	this.camera.setMovable(this.camera.isMovable());
	    	break; 

	    case 78: //press N to stop dynamicaly adding elements
	    	this.dynamic_add_elements = !this.dynamic_add_elements;
	    	break;

	    case 79: //press O to show convas. This is done by changing the style of the canvas and a-scene
	    	if(this.changing_style.innerHTML == this.invr_css)
	    		this.changing_style.innerHTML = this.outvr_css;
	    	else
	    		this.changing_style.innerHTML = this.invr_css;
	    	break;

	    case 73: //press Ctrl + Alt + I to inspect
	    	this.dynamic_add_elements = false;
	    	this.changing_style.innerHTML = this.invr_css;
	    	break;
	    }
	}

	//Switches to a new video source and then shows the player
	showNewVideo(id){
		this.video_element.SetScource(id);
		this.showVideoPlayer();
	}

	//Toggle the media player
	showVideoPlayer(){
		var v_element_visibility = this.video_element.IsVisible();

	    this.video_element.SetVisiblity(!v_element_visibility);
	    this.a_element_container.setAttribute("visible", v_element_visibility);

	    //Set position of the elements away from the clickable part of the world
	    var position = this.a_element_container.getAttribute("position");
	    if(v_element_visibility)
	    	position = {x : position.x, y : position.y+1000, z : position.z};
	    else
			position = {x : position.x, y : position.y-1000, z : position.z};

	    //Set the position
	    this.a_element_container.setAttribute("position", "");
	    this.a_element_container.setAttribute("position", position);
	}

	setAnimationFPS(fps){
		this.animation_fps = fps;
	}
}

//Function to start loading dom2aframe
function load_dom_2_aframe(){
	asset_manager = new AssetManager();
    dom2aframe = new Dom2Aframe();
}

window.addEventListener("load",  load_dom_2_aframe);
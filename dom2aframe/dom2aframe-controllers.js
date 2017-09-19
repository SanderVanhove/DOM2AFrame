var distance_to_camera = 0.4;

class Controllers{
	constructor(camera){
		this.aelement = document.createElement("a-entity");
		this.camera = camera;

		this.right_hand = document.createElement("a-entity");
		this.right_hand.setAttribute("laser-controls", 'hand: right');

		this.left_hand = document.createElement("a-entity");
		this.left_hand.setAttribute("laser-controls", 'hand: left');

		//Triggers when a gamepad gets connected
		window.addEventListener("gamepadconnected", this.controllerConected.bind(this));
	}

	//If a game pad gets conected, remove the cursor from the camera and add the controller
	controllerConected(){
		log("Controller conected");
		this.aelement.appendChild(this.right_hand);
		this.camera.removeCursor();
	}

	setPosition(pos){
		pos.y += distance_to_camera;

		this.aelement.setAttribute("position", pos);
	}

	controllersExist(){
		return navigator.getGamepads().length > 0;
	}
}
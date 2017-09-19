//Manages the assets of the a-scene
class AssetManager{

	constructor(){

		//The section of a-frame where the image and video assets get placed
		var a_assets = document.getElementsByTagName("a-assets");
	    if(a_assets.length > 0){
	    	this.was_assets = true;
			this.assets = a_assets[0];
	    }
		else{
			this.was_assets = false;
			this.assets = document.createElement("a-assets");
		}

		//Add demo video to assets
		//this.assets.innerHTML = '<video id="iwb" src="video/back-yoyo-01.mp4" preload="auto"></video>';
		//Each asset needs a unique id
		this.asset_id = 0;
	}

	addAssetsToScene(scene){
		if(!this.was_assets)
			scene.appendChild(this.assets);
	}

	getAElement(){
		return this.assets;
	}

	//Gives back the id of the asset or makes a new asset
	GetAsset(path, type){
		var assets = this.assets.getChildren();
		//Check there already is an asset entry for this path
		for(var i = 0; i < assets.length; i++)
			if(assets[i].getAttribute("src") === path)
				return assets[i].getAttribute("id");

		//Create a new asset entry if it did not exist yet
		var asset = document.createElement(type);
		asset.setAttribute("src",path);

		//Asset id
	    var id = "asset-" + this.asset_id++;
	    asset.setAttribute("id", id);

	   	this.assets.appendChild(asset);

	    return id;
	}
}
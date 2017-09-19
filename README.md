### How to use the examples:
1. Set up a server from this directory
2. Open index.html
3. Chose example to view
4. Click the "Enter VR" button in the right bottom corner to view the site in VR

### The examples will work in browsers that support the Polyfill of WebVR being:
* Google Chrome
* Mozzila Firefox
* Microsoft Edge (Although not every A-frame aspect is supported and performance is a lot worse than the other browsers)

### To get the examples working with a HMD, please consult:
* For Chromium: https://webvr.rocks/chromium
* For Firefox: https://webvr.rocks/firefox
* For Android: https://webvr.rocks/chrome_for_android then acces the running server on you PC via your Android, use a Google Cardboard or Daydream viewer.
* For Iphone: iOS devices don't support WebVR nativaly, but will make use of the Polyfill, use any browser for Iphones and a Google Cardboard viewer. Features may not work.

Consult https://webvr.rocks/ for more supported devices and the latest updates on WebVR support.

For better performance please ensure that the browser has acces to the graphics card of the device.

---

### How to use dom2aframe on your own page:
* Include these files at the as the lastly added JavaScript files: 
``` HTML
	<!-- A-frame -->
	<script src="https://aframe.io/releases/0.6.1/aframe.min.js"></script>

	<!-- Gradient sky -->
	<script src="https://cdn.rawgit.com/zcanter/aframe-gradient-sky/master/dist/gradientsky.min.js"></script>

	<!-- Resize detector -->
	<script src="js/element-resize-detector.min.js"></script>

	<!-- Video bundle to display videos -->
	<script src="js/aframe-stereo-component.js"></script>
	<script src="js/aframe-video-controls.js"></script>
	<script src="js/aframe-video-bundle.js"></script>

	<!-- Dom2aframe -->
	<script src="js/dom2aframe-assetmanager.js"></script>
	<script src="js/dom2aframe-elements.js"></script>
	<script src="js/dom2aframe-camera.js"></script>
	<script src="js/dom2aframe-controllers.js"></script>
	<script src="js/dom2aframe.js"></script>
```
* When including your own <a-scene> in the HTML page:
	* Add an <a-asstets> element at the start of the scene
	* Wait long enough for dom2aframe to load, else the camera will be placed in the wrong position
	* Images might pop in the wrong place before they get placed correctly

* Use following attributes:
	* hover: to define what class should be applied to the element when the cursor hovers over it -> hover="class"
	* vr-id: the id of the A-frame object representing the element -> vr-id="id"
	* vr-class: the classes of the A-frame object representing the element -> vr-class="class1 class2"
	* show-player: to let dom2aframe switch to the video player when the element gets clicked (no parameters needed) -> show-player
	* play-video: to switch to the new video defined in the attribute and to let dom2aframe switch to the video player when the element gets clicked -> play-video="path/to/video.mp4"

* Use following CSS properties:
	* --vr-x/y/z: to define the placement of the element
	* --vr-position: to define if the element should be placed relative (to its earlier position) or absolute (to the center of the scene)
	* --vr-scale: to scale the element in VR-mode, can be used as: --vr-scale: 2 for a general scale or --vr-scale: 1 2 for the scale along the x and y axis respectively
	* --vr-rotate: to define the rotation around the x, y and z axis respectively

* Use following keyboard shortcuts:
	* o: to show the canvas, without going in VR mode
	* f: to imediately go to VR mode
	* crtl+alt+i:	to show the inspector
	* p: to switch to the video player
	* t: to toggle the video representation modus
	* l: to toggle the ability to move
	* m: to toggle the use of the mouse as cursor on and off. Repeated toggling might break the raycaster, resulting in not being able to click on some objects.

* Make sure that: 
	* Text is put in elements that normaly contain text, like ``` <p> ``` or ``` <span> ```
	* Text doesn't have any other elements in them, like ``` <span> ```

---

### Known issues:
* Three.js error on loading of the page. This is a bug in A-frame itself that occurs when the mouse is used as cursor. This bug should not hinder anything. The A-frame development team knows about this: https://github.com/jeromeetienne/AR.js/issues/148 If A-frame freezes at page load, try moving the mouse cursor around on the page while it loads, this is a bug that lets A-frame crash because the mouse as cursor is not initiated properly by A-frame. This could also throw extra error messages 

* Sometimes the browser doesn't send out an animationend event at the end of an animation resulting in an update loop that keeps going. This occurs when an animation is abruptly ended.

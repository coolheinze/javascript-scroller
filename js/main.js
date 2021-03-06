// Get the 3 viewports and corresponding views
var mainViewPort = $('#mainViewPort');
var mainViewPortView = $('#mainViewPort').children().first();
var hBar = $('#hBar');
var hBarView = $('#hBar').children().first();
var vBar = $('#vBar');
var vBarView = $('#vBar').children().first();

// Variables for positioning and tracking
var maxX = Math.max(0, mainViewPortView.width() - mainViewPort.width());
var offsetX = minX = referenceX = deltaX = 0;
var maxY = Math.max(0, mainViewPortView.height() - mainViewPort.height());
var offsetY = minY = referenceY = deltaY = 0;
var referenceT = new Date().getTime();

// Detect touch for fix browser
var isTouch = typeof window.ontouchstart !== 'undefined';

// Variables for kinetic dynamics
var velX = velY = 0;
var capVel = 2;
var minVel = 0.01;
var damping = 0.05;

var PRESSED = 1, ROLLING = 2, OFF = 0;
var status = OFF;
var didDrag = false;

var xform = 'transform';
['webkit', 'Moz', 'O', 'ms'].every(function (prefix) {
    var e = prefix + 'Transform';
    if (typeof mainViewPortView[0].style[e] !== 'undefined') {
        xform = e;
        return false;
    }
    return true;
});

var requestAnimationFrame;
if ( !window.requestAnimationFrame ) {
	requestAnimationFrame = ( function() {
		return window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
		function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
			window.setTimeout( callback, 1000 / 60 );
		};
	}());
}

mainViewPort.on('touchstart', tap);
hBar.on('touchstart', tap);
vBar.on('touchstart', tap);
$(document).on('touchmove', drag);
$(document).on('touchend', release);

mainViewPort.on('mousedown', tap);
hBar.on('mousedown', tap);
vBar.on('mousedown', tap);
$(document).on('mousemove', drag);
$(document).on('mouseup', release);

// Prevent browser's default dragging of links within scroll area
mainViewPort.find('*').on('dragstart',function(){return false});
hBar.find('*').on('dragstart',function(){return false});
vBar.find('*').on('dragstart',function(){return false});

// Centre view on focused item not fully visible in viewport
mainViewPort.find('*').focus(function(){bringIntoView(mainViewPort, this)});
hBar.find('*').focus(function(){bringIntoView(hBar, this)});
vBar.find('*').focus(function(){bringIntoView(vBar, this)});

// Prevent accidental clicks from being fired when user is dragging
mainViewPort.find('a').click(preventAccidentalClick);
hBar.find('a').click(preventAccidentalClick);
vBar.find('a').click(preventAccidentalClick);

function preventAccidentalClick(e) {
	if(didDrag){
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	return true;
}
function posX(e) {
    // touch event
    if (e.originalEvent.targetTouches && (e.originalEvent.targetTouches.length >= 1)) return e.originalEvent.targetTouches[0].pageX;
    // mouse event
    return e.clientX;
}

function posY(e) {
    // touch event
    if (e.originalEvent.targetTouches && (e.originalEvent.targetTouches.length >= 1)) return e.originalEvent.targetTouches[0].clientY;
    // mouse event
    return e.clientY;
}

function scroll(x, y) {
    offsetY = (y > maxY) ? maxY : (y < minY) ? minY : y;
    offsetX = (x > maxX) ? maxX : (x < minX) ? minX : x;
    mainViewPortView[0].style[xform] = 'translate3d(' + (-offsetX) + 'px, ' + (-offsetY) + 'px, 0px)';
    hBarView[0].style[xform] = 'translate3d(' + (-offsetX) + 'px, 0px, 0px)';
    vBarView[0].style[xform] = 'translate3d(0px, ' + (-offsetY) + 'px, 0px)';
}

function tap(e) {
    status = PRESSED;
	requestAnimationFrame(function(){didDrag = false;}); // Due to iOS firing down, up and click at once, wait a little before clearing var
    referenceY = posY(e);
    referenceX = posX(e);
	velX = velY = 0;
    return true;
}

function drag(e) {
	if (status == PRESSED) {
		var x, y;
		x = posX(e);
		y = posY(e);
		deltaX = referenceX - x;
		deltaY = referenceY - y;
		
		if (deltaX > 2 || deltaX < -2 || deltaY > 2 || deltaY < -2) {
			didDrag = true;
			
			var now = new Date().getTime();
			velX = deltaX / (now - referenceT);
			velY = deltaY / (now - referenceT);
			
			referenceT = now;
			
			referenceX = x;
			referenceY = y;
			scroll(offsetX + deltaX, offsetY + deltaY);
		}
		if(offsetY + deltaY <= minY || offsetY + deltaY >= maxY) return true;
		
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	return true;
}

function release() {
    status = ROLLING;
	referenceT = new Date().getTime();
	if(velX*velX + velY*velY > capVel*capVel) {
		// Check if this works
		velX = velX/(Math.abs(velX) + Math.abs(velY)) * capVel;
		velY = velY/(Math.abs(velX) + Math.abs(velY)) * capVel;
	}
	roll();
    return true;
}

function roll() {
	if(status == ROLLING) {
		if(Math.abs(velX) < minVel && Math.abs(velY) < minVel) return status = OFF;
		var now = new Date().getTime();
		var deltaT = now - referenceT;
		var incrementalDamping = Math.pow(damping,deltaT/1000);
		velX = velX * incrementalDamping;
		velY = velY * incrementalDamping;
		deltaX = velX * deltaT;
		deltaY = velY * deltaT;
		scroll(offsetX + deltaX, offsetY + deltaY);
		referenceT = now;
		requestAnimationFrame(roll);
	}
}

function jumpTo(viewPort, element) {
	var position = $(element).position();
	var x = (viewPort == vBar ? 0 : position.left - (viewPort.width()/2) + ($(element).width()/2));
	var y = (viewPort == hBar ? 0 : position.top - (viewPort.height()/2) + ($(element).height()/2));
	scroll(x,y);
}

function bringIntoView(viewPort, element) {
	requestAnimationFrame(function(){
		viewPort.scrollLeft(0);
		viewPort.scrollTop(0);
		if(status != OFF) return;
		var position = $(element).position();
		if(offsetX > position.left ||
		   offsetY > position.top ||
		   offsetX + viewPort.width() < position.left + $(element).width() ||
		   offsetY + viewPort.height() < position.top + $(element).height())
			jumpTo(viewPort, element);
	});
}

    /**
     * Provides requestAnimationFrame in a cross browser
     * way.
     */
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function() {
      return window.requestAnimationFrame ||
             window.webkitRequestAnimationFrame ||
             window.mozRequestAnimationFrame ||
             window.oRequestAnimationFrame ||
             window.msRequestAnimationFrame ||
             function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
               window.setTimeout(callback, 1000/60);
             };
    })();
  }
       
  var gl;
  function initGL(canvas)
  {
    try {
      gl = canvas.getContext("experimental-webgl");
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;
    } catch(e) {
    }
    if (!gl) {
      alert("Could not initialise WebGL.  Please make sure your browser supports WebGL.");
    }
  }


  
  var mvMatrix;

  function loadIdentity() {
    mvMatrix = Matrix.I(4);
  }


  function multMatrix(m) {
    mvMatrix = mvMatrix.x(m);
  }


  function mvTranslate(v) {
    var m = Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
    multMatrix(m);
  }

  function createRotationMatrix(angle, v) {
    var arad = angle * Math.PI / 180.0;
    return Matrix.Rotation(arad, $V([v[0], v[1], v[2]])).ensure4x4();
  }

  function mvRotate(ang, v) {
    var arad = ang * Math.PI / 180.0;
    var m = Matrix.Rotation(arad, $V([v[0], v[1], v[2]])).ensure4x4();
    multMatrix(m);
  }

  function matScale(m, sx, sy, sz)
  {
    m.elements[0][0] *= sx;
    m.elements[0][1] *= sx;
    m.elements[0][2] *= sx;
    m.elements[0][3] *= sx;

    m.elements[1][0] *= sy;
    m.elements[1][1] *= sy;
    m.elements[1][2] *= sy;
    m.elements[1][3] *= sy;

    m.elements[2][0] *= sz;
    m.elements[2][1] *= sz;
    m.elements[2][2] *= sz;
    m.elements[2][3] *= sz;

  }
  function mvScale(sx, sy, sz)
  {
    matScale(mvMatrix, sx, sy, sz);
    
  }

  var pMatrix;
  function perspective(fovy, aspect, znear, zfar) {
    pMatrix = makePerspective(fovy, aspect, znear, zfar);
  }


  var z = -4.0;
  var currentlyPressedKeys = Object();

  function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;

    // Handle key presses here
  }


  function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
  }


  function handleKeys() {
    if (currentlyPressedKeys[33]) {
      // Page Up
      z -= 0.05;
    }
    if (currentlyPressedKeys[34]) {
      // Page Down
      z += 0.05;
    }    
  }


  var mouseDown = false;
  var lastMouseX = null;
  var lastMouseY = null;

  var brainRotationMatrix = Matrix.I(4);

  function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }


  function handleMouseUp(event) {
    mouseDown = false;
  }


  function handleMouseMove(event) {
    if (!mouseDown) {
      return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX
    var newRotationMatrix = createRotationMatrix(deltaX / 10, [0, 1, 0]);

    var deltaY = newY - lastMouseY;
    newRotationMatrix = newRotationMatrix.x(createRotationMatrix(deltaY / 10, [1, 0, 0]));

    brainRotationMatrix = newRotationMatrix.x(brainRotationMatrix);

    lastMouseX = newX
    lastMouseY = newY;
  }

  function handleMouseWheel(e) {
    // From SpiderGL
    var delta = 0;
    if (!e) /* For IE. */ {
            e = window.event;
    }
    if (e.wheelDelta) /* IE/Opera. */ {
            delta = e.wheelDelta / 120;
            /* In Opera 9, delta differs in sign as compared to IE.
             */
            if (window.opera) {
                    delta = -delta;
            }
    }
    else if (e.detail) /** Mozilla case. */ {
            /** In Mozilla, sign of delta is different than in IE.
             * Also, delta is multiple of 3.
             */
            delta = -e.detail / 3;
    }
    /* If delta is nonzero, handle it.
     * Basically, delta is now positive if wheel was scrolled up,
     * and negative, if wheel was scrolled down.
     */
    if (delta) {
        z += (delta / 2);
    }
  }

  var gBrainSurfaces = new Array(2);
  var gTracks = new Tractography();
  
  var gConnectome = new Connectome(); // steveg turned off drawing
  
  var gScalarBar = null;
  var gTextLayer = null;
  var gHistogram = null;
  var gBaseURL = '/demo_data/surf';
  

  function loadMRIS(surface, surfaceFile, callback)
  {
      mrisURL = gBaseURL;
      console.log('URL: ' + mrisURL + '/' + surfaceFile);
      surface.loadSurface(mrisURL + '/' + surfaceFile, callback);
  }



  function drawScene() {

    var canvas = document.getElementById("webgl-canvas");
    canvas.width = canvas.clientWidth;//window.innerWidth;
    canvas.height =canvas.clientHeight;//window.innerHeight;
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    var scale = 0.01513;

    ////////////////////////////////////////////////////////////////////////
    //  Draw Tractography
    ////////////////////////////////////////////////////////////////////////
    loadIdentity();
    mvScale(scale, scale, scale);
    mvTranslate([0.0, 0.0, z / scale]);
        
    multMatrix(brainRotationMatrix);

    // This is need to switch from left-handed to right-handed coordinate
    // frame for the tracks
    var origMatrix = mvMatrix.dup();
    mvMatrix.elements[0][1] = origMatrix.elements[0][2];
    mvMatrix.elements[1][1] = origMatrix.elements[1][2];
    mvMatrix.elements[2][1] = origMatrix.elements[2][2];

    mvMatrix.elements[0][2] = origMatrix.elements[0][1];
    mvMatrix.elements[1][2] = origMatrix.elements[1][1];
    mvMatrix.elements[2][2] = origMatrix.elements[2][1];


    
    // I described the way these matrices are created here:
    //  http://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferTrackVisTransforms
    // For demo purposes, these are hard-coded here, whereas in an actual
    // version of it these will be loaded via XHTTPRequest.

    // mri_info dti_b0.nii --vox2ras-tkr
    var CRSd2XYZtkreg = $M([[-2.00000,   0.00000,   0.00000,  110.00000],
                            [0.00000,    0.00000,    2.00000,  -79.00000],
                            [0.00000,   -2.00000,    0.00000,  110.00000],
                            [0.00000,    0.00000,    0.00000,    1.00000]]);

    // bbregister --s <subject> --mov dti_b0.nii --init-fsl --reg bbregister.dat --bold --tol1d 1e-3
    var bbregmatrix = $M([[9.994560e-01, -2.959258e-02, -1.456270e-02, -2.266882e+00],
                          [1.266916e-02, -6.318483e-02, 9.979210e-01, -2.148178e+01],
                          [3.045095e-02, 9.975628e-01, 6.277557e-02, 4.659803e-01],
                          [0, 0, 0, 1]]);

    multMatrix(CRSd2XYZtkreg);


    if (gShowTracks && gTracks.vertexPositionBuffer != null)
    {
        gTracks.drawTracks(pMatrix, mvMatrix);
    }

    
    ////////////////////////////////////////////////////////////////////////
    //  Draw Brain Surfaces
    ////////////////////////////////////////////////////////////////////////
    loadIdentity();
    mvScale(scale, scale, scale);
    mvTranslate([0.0, 0.0, z / scale]);
    multMatrix(brainRotationMatrix);

    // This is need to switch from left-handed to right-handed coordinate
    // frame for the tracks
    var origMatrix = mvMatrix.dup();
    mvMatrix.elements[0][1] = origMatrix.elements[0][2];
    mvMatrix.elements[1][1] = origMatrix.elements[1][2];
    mvMatrix.elements[2][1] = origMatrix.elements[2][2];

    mvMatrix.elements[0][2] = origMatrix.elements[0][1];
    mvMatrix.elements[1][2] = origMatrix.elements[1][1];
    mvMatrix.elements[2][2] = origMatrix.elements[2][1];
    
    multMatrix(bbregmatrix);

    // Draw connectome nodes
    if (gShowConnectomeNodes)
    {
        gConnectome.drawConnectomeNodes(pMatrix, mvMatrix);
    }

    if (gShowConnectomeEdges)
    {
        gConnectome.drawConnectomeEdges(pMatrix, mvMatrix);
    }
    
    gl.frontFace( gl.CCW );
    gl.enable( gl.CULL_FACE );
    gl.enable( gl.BLEND );
    gl.blendFunc ( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

    

    if (gHemisphere[0] && gBrainSurfaces[0].vertexPositionBuffer != null)
    {
        gBrainSurfaces[0].drawSurface(pMatrix, mvMatrix, gThreshold);
    }
    if (gHemisphere[1] && gBrainSurfaces[1].vertexPositionBuffer != null)
    {
        gBrainSurfaces[1].drawSurface(pMatrix, mvMatrix, gThreshold);
    }
    
    // Draw 2D widgets
    // steveg: don't draw them
    if (false && gBrainSurfaces[0].vertexCurvatureBuffer != null &&
        gBrainSurfaces[1].vertexCurvatureBuffer != null &&
        gBrainSurfaces[0].drawCurvature == 1 &&
        gBrainSurfaces[1].drawCurvature == 1)
    {
        pMatrix = makeOrtho(0.0, 1.0, 0.0, 1.0, -1.0, 1.0);
        loadIdentity();
        //mvTranslate([0.75, 0.6, -7.0]);
        mvScale(0.03, 0.16, 1.0);
        gScalarBar.draw(pMatrix, mvMatrix);
        
        // Draw text
        gTextLayer.startRendering('text');
        gTextLayer.drawText(0.065, 0.99, gBrainSurfaces[0].curCurvMin[0].toFixed(2) );
        gTextLayer.drawText(0.065, 0.85, gBrainSurfaces[0].curCurvMax[0].toFixed(2) );
        gTextLayer.endRendering();

        if (gShowHistogram)
        {
            loadIdentity();
            mvTranslate([0.75, 0.0, 0.0]);
            mvScale(0.12, 0.14, 1.0);
            gHistogram.draw(pMatrix, mvMatrix, gBrainSurfaces[0].curCurvMin[0],
                            gBrainSurfaces[0].curCurvMax[0]);
        }
    }
    
  }

  var lastTime = 0;
  function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
      var elapsed = timeNow - lastTime;

      // Animate here
    }
    lastTime = timeNow;
  }

  function tick() {
    var canvas = document.getElementById("webgl-canvas");
    window.requestAnimationFrame(tick, canvas);
    
    handleKeys();
    drawScene();
    animate();

    $("#loading").empty().html("");

  }

var gHemisphere = [ true, true ];
var gHemisphereNames = [ 'lh', 'rh' ];
var gSurface = 'smoothwm'
var gCurvature = undefined;
var gShowTracks = true;
var gShowConnectomeNodes = false;
var gShowConnectomeEdges = false;
var gThreshold = 0;
var gShowHistogram = false;
var gCurMinCurv = 0.0;
var gCurMaxCurv = 0.0;

  function webGLStart() {
    var canvas = document.getElementById("webgl-canvas");
    if (canvas == null)
        return;

    initGL(canvas);

    $("#loading").empty().html('Loading, please wait...');
    gBrainSurfaces[0] = new BrainSurface();
    gBrainSurfaces[1] = new BrainSurface();    
    loadMRIS( gBrainSurfaces[0], gHemisphereNames[0] + '.' + gSurface, handleLoadedSurface );
    loadMRIS( gBrainSurfaces[1], gHemisphereNames[1] + '.' + gSurface, handleLoadedSurface);
    gTracks.loadTracks("/demo_data/streamline.trk");

    gConnectome.loadConnectome("/demo_data/connectome/nodes.json",
                               "/demo_data/connectome/edges.json",
                               handleLoadedConnectomeNodes, handleLoadedConnectomeEdges);

    gScalarBar = new ScalarBar();
    gScalarBar.setColorRange([0.0, 1.0, 0.0, 1.0], [1.0, 0.0, 0.0, 1.0]);

    gHistogram = new Histogram();
    
    gTextLayer = new TextLayer();

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    //gl.clearColor(0.6, 0.6, 0.6, 1.0); // steveg: modified from (0.0, 0.0, 0.0, 0.0)

    gl.clearDepth(1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
    document.onmousewheel = handleMouseWheel;

    tick();
  }


function surfaceChanged()
{
    gSurface = $('#surface_select :selected').val();

    loadMRIS( gBrainSurfaces[0], gHemisphereNames[0] + '.' + gSurface, handleLoadedSurface );
    loadMRIS( gBrainSurfaces[1], gHemisphereNames[1] + '.' + gSurface, handleLoadedSurface );
}

function toggleHemispheres()
{
    gHemisphere[0] = ($('#lh_hemisphere:checked').val() != undefined) ? true : false;
    gHemisphere[1] = ($('#rh_hemisphere:checked').val() != undefined) ? true : false;
}

function toggleTracks()
{
    gShowTracks = $('#tractography:checked').val();
}

function toggleThreshold()
{
    if ($('#threshold:checked').val() == "on")
        gThreshold = 1;
    else
        gThreshold = 0;
}

function curvatureChanged()
{
    gCurvature = $('#curvature_select :selected').val();

    if (gCurvature == 'None')
    {
        $( "#min_hist").val( '' );
        $( "#max_hist").val( '' );
        $( "#curv_stats_lh" ).val( '' );
        $( "#curv_stats_rh" ).val( '' );
        gBrainSurfaces[0].drawCurvature = 0;
        gBrainSurfaces[1].drawCurvature = 0;
        gShowHistogram = false;
    }
    else
    {
        for (var hemi = 0; hemi < 2; hemi++)
        {
            var crvFile;
            if (gCurvature == 'thickness')
            {
                crvFile = gHemisphereNames[hemi] + '.' + gCurvature;                
            }
            else
            {
                crvFile = gHemisphereNames[hemi] + '.' + gSurface + '.' + gCurvature + '.crv'                
            }			  
            var crvURL = gBaseURL;
            console.log('URL: ' + crvURL + '/' + crvFile);
            gBrainSurfaces[hemi].loadCurvature(crvURL + '/' + crvFile, handleLoadedCurvature);
        }        
    }

}

function minHistChanged()
{
    gCurMinCurv = parseFloat($("#min_hist").val());
    updateCurvature(true);
}

function maxHistChanged()
{
    gCurMaxCurv = parseFloat($("#max_hist").val());
    updateCurvature(true);
}

function handleLoadedSurface(brainSurface)
{

    if (gBrainSurfaces[0].vertexPositionBuffer != null &&
        gBrainSurfaces[1].vertexPositionBuffer != null)
    {
        curvatureChanged();
        var value = $( "#slider-opacity" ).slider( "option", "value" );
        var minSlider = 0;
        var maxSlider = 100;
        var opacity = (value - minSlider) / (maxSlider - minSlider)

        gBrainSurfaces[0].setOpacity(opacity);
        gBrainSurfaces[1].setOpacity(opacity);
    }
}

function handleLoadedConnectomeNodes(connectome)
{
    gShowConnectomeNodes = false; // steveg changed true;
}


function handleLoadedConnectomeEdges(connectome)
{
    gShowConnectomeEdges = false; // steveg changed true;
}


function updateCurvature(regenerateHistogram)
{
    var values = $( "#slider-range" ).slider( "option", "values" );
    var minSlider = 0;
    var maxSlider = 1000;

    var curSliderMin = (values[0] - minSlider) / (maxSlider - minSlider);
    var curSliderMax = (values[1] - minSlider) / (maxSlider - minSlider);
 
    if (gBrainSurfaces[0].vertexCurvatureBuffer != null &&
        gBrainSurfaces[1].vertexCurvatureBuffer != null)
    {
        for (var hemi = 0; hemi < 2; hemi++)
        {
            gBrainSurfaces[hemi].curCurvMin[0] = (1.0 - curSliderMin) * gCurMinCurv + curSliderMin * gCurMaxCurv;
            gBrainSurfaces[hemi].curCurvMax[0] = (1.0 - curSliderMax) * gCurMinCurv + curSliderMax * gCurMaxCurv;
        }

        if (gCurvature != 'None')
        {
            $( "#min_hist").val( gCurMinCurv.toFixed(2) );
            $( "#max_hist").val( gCurMaxCurv.toFixed(2) );

            $( "#curv_stats_lh").text('Left Hemi Range: (' + gBrainSurfaces[0].crvFile.minCurv[0].toFixed(2) +
                                        ', ' + gBrainSurfaces[0].crvFile.maxCurv[0].toFixed(2) +
                                        ') Mean: ' + gBrainSurfaces[0].crvFile.mean.toFixed(2) +
                                        ' Std Dev: ' + gBrainSurfaces[0].crvFile.stdDev.toFixed(2));
                                    
            $( "#curv_stats_rh").text('Right Hemi Range: (' + gBrainSurfaces[1].crvFile.minCurv[0].toFixed(2) +
                                       ', ' + gBrainSurfaces[1].crvFile.maxCurv[0].toFixed(2) +
                                        ') Mean: ' + gBrainSurfaces[1].crvFile.mean.toFixed(2) +
                                        ' Std Dev: ' + gBrainSurfaces[1].crvFile.stdDev.toFixed(2));
        }
        else
        {
            $( "#min_hist").val( '' );
            $( "#max_hist").val( '' );
            $( "#curv_stats_lh").text( '' );
            $( "#curv_stats_rh").text( '' );
        }


        // steveg: Don't show histogram
        if (false) //regenerateHistogram == true)
        {
            var length1 = gBrainSurfaces[0].crvFile.vertexCurvatureBuffer.length;
            var length2 = gBrainSurfaces[1].crvFile.vertexCurvatureBuffer.length;
            var totalLength = length1 + length2;
            var curvatureBuffer = new Float32Array(totalLength);
            for (var i = 0; i < length1; i++)
            {
                curvatureBuffer[i] = gBrainSurfaces[0].crvFile.vertexCurvatureBuffer[i];
            }
            for (var i = 0; i < length2; i++)
            {
                curvatureBuffer[i + length1] = gBrainSurfaces[1].crvFile.vertexCurvatureBuffer[i];
            }
            gHistogram.computeHistogram(curvatureBuffer, totalLength, 100, gCurMinCurv, gCurMaxCurv);
            gShowHistogram = true;
        }
    }
}

function handleLoadedCurvature(brainSurface)
{
    if (gBrainSurfaces[0].vertexCurvatureBuffer != null &&
        gBrainSurfaces[1].vertexCurvatureBuffer != null)
    {        
        // Get the min/max from both hemispheres
        gCurMinCurv = gBrainSurfaces[0].crvFile.minCurv[1];
        gCurMaxCurv = gBrainSurfaces[0].crvFile.maxCurv[1];
        if (gBrainSurfaces[1].crvFile.minCurv[1] < gCurMinCurv)
            gCurMinCurv = gBrainSurfaces[1].crvFile.minCurv[1];
        if (gBrainSurfaces[1].crvFile.maxCurv[1] < gCurMaxCurv)
            gCurMaxCurv = gBrainSurfaces[1].crvFile.maxCurv[1];

        updateCurvature(true);
    }
}

function handleOpacitySlider(event, ui)
{
    var minSlider = 0;
    var maxSlider = 100;
    var opacity = (ui.value - minSlider) / (maxSlider - minSlider)

    gBrainSurfaces[0].setOpacity(opacity);
    gBrainSurfaces[1].setOpacity(opacity);
}

function handleTrackLengthSlider(event, ui)
{
    //var minSlider = 0;
    //var maxSlider = 100;
    //var minTrackLength = (ui.value - minSlider) / (maxSlider - minSlider)

    gTracks.setMinTrackLength(ui.value);
}

function handleCurvatureSlider(event, ui)
{
    var minSlider = 0;
    var maxSlider = 1000;

    var curSliderMin = (ui.values[0] - minSlider) / (maxSlider - minSlider);
    var curSliderMax = (ui.values[1] - minSlider) / (maxSlider - minSlider);

    for (var hemi = 0; hemi < 2; hemi++)
    {
        gBrainSurfaces[hemi].curCurvMin[0] = (1.0 - curSliderMin) * gCurMinCurv + curSliderMin * gCurMaxCurv;
        gBrainSurfaces[hemi].curCurvMax[0] = (1.0 - curSliderMax) * gCurMinCurv + curSliderMax * gCurMaxCurv;
    }
}

$(function() {
		$( "#controls" ).accordion({
			fillSpace: true,
      autoHeight: false
		});
    
    $( "#viewer" ).accordion({
			fillSpace: true,
      autoHeight: false
		});

    $( "#slider-range" ).slider({
			range: true,
			min: 0,
			max: 1000,
			values: [ 420, 576 ],
			slide: handleCurvatureSlider
		});
    
    $( "#slider-opacity" ).slider({
      range: false,
			min: 0,
			max: 100,
			value: 0, // steveg: modified from 100
			slide: handleOpacitySlider
		});
      
    $( "#slider-tracklength" ).slider({
      range: false,
			min: 0,
			max: 100,
			value: 0, // steveg: modified from 15
			slide: handleTrackLengthSlider
		});
});
  
// Make sure the accordions get resized properly to 100%.
$(window).resize(function(){
    $("#controls").accordion("resize");
    $("#viewer").accordion("resize");
});
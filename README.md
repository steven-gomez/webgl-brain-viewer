# WebGL-based Tractography Viewer

This project includes a simple Web-based viewer for human brain tractography, based on [Dan Ginsburg's viewer](https://github.com/danginsburg/webgl-brain-viewer
).  This application is a testbed for experiments exploring visualization design and tractography task performance.

The viewer loads and renders files from:
* [FreeSurfer](http://surfer.nmr.mgh.harvard.edu/)
* [TrackVis](http://www.trackvis.org)

Authors of this version of the viewer include:
Steven Gomez

## Running and Developing

A quick way to run the application locally is to use Python's built-in web server from the main project directory.

	python -m SimpleHTTPServer

Then, view the visualization in a WebGL-enabled browser at: http://localhost:8000/brain_viewer/brain_viewer.html

## Original Authors

This project was forked from the Brain Surface and Tractography Viewer, which was developed at Children's Hospital Boston in the Fetal-Neonatal Neuroimaging and Development Science Center. The original authors are Dan Ginsburg, Rudolph Pienaar, and Stephan Gerhard.

The original GitHub repository is available at: https://github.com/danginsburg/webgl-brain-viewer

A demo can be viewed at: http://www.nmr.mgh.harvard.edu/~rudolph/webgl/brain_viewer/brain_viewer.html

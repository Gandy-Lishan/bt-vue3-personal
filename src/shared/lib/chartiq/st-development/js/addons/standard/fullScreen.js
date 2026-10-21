/**
 *	8.3.0
 *	Generation date: 2021-11-02T13:40:51.589Z
 *	Client name: sundial capital research
 *	Package Type: Technical Analysis
 *	License type: annual
 *	Expiration date: "2022/10/01"
 *	Domain lock: ["127.0.0.1","localhost","sentimentrader.com","18.117.142.18","bt20.sentimentrader.com"]
 *	iFrame lock: true
 */

/***********************************************************
 * Copyright by ChartIQ, Inc.
 * Licensed under the ChartIQ, Inc. Developer License Agreement https://www.chartiq.com/developer-license-agreement
*************************************************************/
/*************************************** DO NOT MAKE CHANGES TO THIS LIBRARY FILE!! **************************************/
/* If you wish to overwrite default functionality, create a separate file with a copy of the methods you are overwriting */
/* and load that file right after the library has been loaded, but before the chart engine is instantiated.              */
/* Directly modifying library files will prevent upgrades and the ability for ChartIQ to support your solution.          */
/*************************************************************************************************************************/
/* eslint-disable no-extra-parens */


import {CIQ} from "chartiq/js/chartiq.js";

let __st_addons_standard_fullscreen_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */

var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

/**
 * Creates an add-on that sets the chart UI to full-screen mode. In full-screen mode, a class
 * `full-screen` is added to the context element used for styling. In addition, elements with the
 * class `full-screen-hide` are hidden. Elements with the class `full-screen-show` that are
 * normally hidden are shown.
 *
 * Requires *addOns.js*.
 *
 * ![Full-screen display](./img-Full-Screen-Chart.png)
 *
 * @param {object} params Configuration parameters.
 * @param {CIQ.ChartEngine} [params.stx] The chart object.
 *
 * @constructor
 * @name CIQ.FullScreen
 * @since 7.3.0
 *
 * @example
 * new CIQ.FullScreen({ stx: stxx });
 */
CIQ.FullScreen =
	CIQ.FullScreen ||
	function (params) {
		if (!params) params = {};
		if (!params.stx) {
			console.warn("The Full Screen addon requires an stx parameter");
			return;
		}
		// Check for loading within an iframe from another origin
		try {
			if (window.location.host !== window.top.location.host)
				throw new Error(
					window.location.host + " does not match " + window.top.location.host
				);
		} catch (exception) {
			console.warn("Full screen mode disabled.");
			return;
		}
		this.stx = params.stx;
		this.stx.fullScreen = this;
		this.fullScreenButton = null;
		this.fullScreenState = false;

		//Attaches FullScreen button to HTML DOM inside .chartSize element
		this.addFullScreenButton = function () {
			if (this.stx.registerChartControl)
				this.fullScreenButton = this.stx.registerChartControl(
					"stx-full-screen",
					"Full Screen",
					(function (self) {
						return function (e) {
							self.fullScreenToggle(e);
							e.stopPropagation();
						};
					})(this)
				);
		};

		//Click event handler for the Full Screen button.
		this.fullScreenToggle = function (e) {
			var docElm = document.getElementById('chart_box')
			// First check for availability of the requestFullScreen function
			if (
				docElm.requestFullscreen ||
				docElm.webkitRequestFullscreen ||
				docElm.mozRequestFullscreen ||
				docElm.msRequestFullscreen
			) {
				// Check if full screen is already enabled
				if (this.getFullScreenElement()) {
					if (document.exitFullscreen) document.exitFullscreen();
					else if (document.webkitExitFullscreen)
						document.webkitExitFullscreen();
					else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
					else if (document.msExitFullscreen) document.msExitFullscreen();
				} else {
					// requestFullscreen methods need to be checked for again here because the browser will not allow the method to be stored in a local var
					if (docElm.requestFullscreen)
						docElm.requestFullscreen();
					else if (docElm.webkitRequestFullscreen)
						docElm.webkitRequestFullscreen();
					else if (docElm.mozRequestFullscreen)
						docElm.mozRequestFullscreen();
					else if (docElm.msRequestFullscreen)
						docElm.msRequestFullscreen();
				}
			} else {
				//If the full screen api isn't available, manually trigger the fullScreen styling
				this.fullScreenState = !this.fullScreenState;
				this.fullScreenRender();
			}
		};

		// Append/remove full-screen class to context or body and update button state
		this.fullScreenRender = function () {
			var containerElement = null;
			containerElement = this.stx.container.closest(
				"*[cq-context], cq-context, body"
			);
			if (containerElement) {
				if (this.fullScreenState === true) {
					if (this.fullScreenButton)
						this.fullScreenButton.classList.add("active");
					containerElement.classList.add("full-screen");
				} else {
					if (this.fullScreenButton)
						this.fullScreenButton.classList.remove("active");
					containerElement.classList.remove("full-screen");
				}
				// Trigger a resize event to update the chart size
				window.dispatchEvent(new Event("resize"));
			}
		};

		//Handle full screen change
		this.onFullScreenChange = function () {
			if (this.getFullScreenElement()) {
				this.fullScreenState = true;
			} else {
				this.fullScreenState = false;
			}
			this.fullScreenRender();
		};

		this.getFullScreenElement = function () {
			return (
				document.fullscreenElement ||
				document.webkitCurrentFullScreenElement ||
				document.mozFullScreenElement ||
				document.msFullscreenElement
			);
		};

		document.addEventListener(
			"fullscreenchange",
			this.onFullScreenChange.bind(this),
			false
		);
		document.addEventListener(
			"webkitfullscreenchange",
			this.onFullScreenChange.bind(this),
			false
		);
		document.addEventListener(
			"mozfullscreenchange",
			this.onFullScreenChange.bind(this),
			false
		);
		document.addEventListener(
			"MSFullscreenChange",
			this.onFullScreenChange.bind(this),
			false
		);

		// Add the FullScreen button to chartControls
		this.addFullScreenButton();
	};

};


export {__st_addons_standard_fullscreen_};
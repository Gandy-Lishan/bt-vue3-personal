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



import { CIQ as _CIQ } from "chartiq/js/chartiq.js";

var CIQ = typeof _CIQ !== "undefined" ? _CIQ : {}.CIQ;

if (!CIQ.Marker) {
	console.error(
		"highPerformanceMarkers feature requires first activating markers feature."
	);
} else if (!CIQ.Marker.stPerformance) {
	/**
	 * Removes a high performance canvas marker from the `markerHelper.domMarkers` Array.
	 * We use this instead of {@link CIQ.ChartEngine#removeFromHolder} because that will remove the whole marker instead of just removing the DOM node.
	 *
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance#remove} instead.
	 */
	CIQ.ChartEngine.prototype.removeDOMMarker = function (marker) {
		console.warn(
			"CIQ.ChartEngine#removeDOMMarker is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance#remove instead."
		);
		CIQ.Marker.stPerformance.prototype.removeDOMMarker.call(
			marker.params.node,
			marker
		);
	};

	/**
	 * <span class="animation">Animation Loop</span>
	 *
	 * Iterates through all [high performance canvas]{@link CIQ.Marker.stPerformance} markers and draws them on the canvas.
	 *
	 * See {@tutorial Markers} tutorials for additional implementation instructions.
	 *
	 * @memberOf CIQ.ChartEngine
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawMarkers} instead.
	 */
	CIQ.ChartEngine.prototype.drawMarkers = function () {
		console.warn(
			"CIQ.ChartEngine#drawMarkers is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawMarkers instead."
		);
		CIQ.Marker.stPerformance.drawMarkers(this);
	};

	/**
	 * Calculates the styles used in drawing [high performance canvas]{@link CIQ.Marker.stPerformance} markers.
	 * We use this method instead of other chart styling methods because markers expect styles to cascade down and then be calculated.
	 * Other style methods are for adding or calculating a single property.
	 * This will save styles to the engine's style object where they can be adjusted with {@link CIQ.ChartEngine#setStyle}.
	 *
	 * @memberof CIQ.ChartEngine
	 * @param {CIQ.Marker} marker The marker from which to compute the styles.
	 * @param {string} style Name to save to {@link CIQ.ChartEngine#styles}.
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.calculateMarkerStyles}.
	 */
	CIQ.ChartEngine.prototype.calculateMarkerStyles = function (marker, style) {
		console.warn(
			"CIQ.ChartEngine#calculateMarkerStyles is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.calculateStyles instead."
		);
		CIQ.Marker.stPerformance.calculateMarkerStyles(this, marker, style);
	};

	/**
	 * Draws a circle for a [high performance canvas]{@link CIQ.Marker.stPerformance} marker.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawCircleMarker}.
	 */
	CIQ.ChartEngine.prototype.drawCircleMarker = function (
		marker,
		style,
		params
	) {
		console.warn(
			"CIQ.ChartEngine#drawCircleMarker is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawCircleMarker instead."
		);
		CIQ.Marker.stPerformance.drawCircleMarker(marker, style, params);
	};

	/**
	 * Draws a square for a [high performance canvas]{@link CIQ.Marker.stPerformance} marker.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawSquareMarker}.
	 */
	CIQ.ChartEngine.prototype.drawSquareMarker = function (
		marker,
		style,
		params
	) {
		console.warn(
			"CIQ.ChartEngine#drawSquareMarker is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawSquareMarker instead."
		);
		CIQ.Marker.stPerformance.drawSquareMarker(marker, style, params);
	};

	/**
	 * Draws callout (rectangular) a [high performance canvas]{@link CIQ.Marker.stPerformance} marker.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawCalloutMarker}.
	 */
	CIQ.ChartEngine.prototype.drawCalloutMarker = function (
		marker,
		style,
		params
	) {
		console.warn(
			"CIQ.ChartEngine#drawCalloutMarker is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawCalloutMarker instead."
		);
		CIQ.Marker.stPerformance.drawCalloutMarker(marker, style, params);
	};

	/**
	 * Draws a stem for a [high performance canvas]{@link CIQ.Marker.stPerformance} marker.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawMarkerStem}.
	 */
	CIQ.ChartEngine.prototype.drawMarkerStem = function (marker, style, params) {
		console.warn(
			"CIQ.ChartEngine#drawMarkerStem is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawMarkerStem instead."
		);
		CIQ.Marker.stPerformance.drawMarkerStem(marker, style, params);
	};

	/**
	 * Positions any markers that have DOM elements appended to the chart so that they follow their same canvas marker.
	 *
	 * @private
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Scheduled for deprecation in a future release. See {@link CIQ.Marker.stPerformance.drawMarkers}.
	 */
	CIQ.ChartEngine.prototype.positionDOMMarkers = function () {
		console.warn(
			"CIQ.ChartEngine#positionDOMMarkers is scheduled for deprecation in a future release\n Please use CIQ.Marker.stPerformance.drawMarkers instead."
		);
		CIQ.Marker.stPerformance.drawMarkers(this);
	};

	/**
	 * Creates high performance canvas nodes that can be used with a {@link CIQ.Marker}.
	 *
	 * Use this class if you need to add hundreds or thousands of markers to a chart. When a
	 * marker is created, this class creates a node from the built-in template but does not attach
	 * the node to the DOM until you hover over the canvas drawing. Once you intersect the drawing,
	 * the node is appended and you can interact with it like other markers.
	 *
	 * The canvas draws the marker based on the classes that you append to the template (which
	 * come from `params.type` and `params.category`) being added to `stx-marker` class.
	 * See {@link CIQ.ChartEngine#calculateMarkerStyles} for more information.
	 *
	 * This class takes the same params as {@link CIQ.Marker.Simple} so that the appended DOM
	 * marker works the same. This means that you can reuse all of the default styles you've
	 * created for `CIQ.Marker.Simple` with `CIQ.Marker.stPerformance`. **Note:** If you do not pass
	 * in either a `headline` or a `story` or both, your marker will not create a pop-up display
	 * when the marker is selected.
	 *
	 * See the {@tutorial Markers} tutorial for additional implementation instructions.
	 *
	 * @param {Object} params Parameters to describe the marker.
	 * @param {string} params.type The marker type to be drawn.
	 * <br>Available options are:
	 * - "circle"
	 * - "square"
	 * - "callout"
	 * @param {string} [params.headline] The headline text to pop up when clicked.
	 * @param {string} [params.category] The category class to add to your marker.
	 * <br>Available options are:
	 * - "news"
	 * - "earningsUp"
	 * - "earningsDown"
	 * - "dividend"
	 * - "filing"
	 * - "split"
	 *
	 * Other custom categories require a corresponding CSS entry. See example.
	 *
	 * @param {boolean} [params.displayCategory=true] Set to false to not draw the first letter of
	 * 		the category in the marker.
	 * @param {string} [params.story] The story to pop up when clicked. If left undefined, the
	 * 		marker displays an empty DOM node when clicked.
	 * @param {string} [params.color] Background color to make your marker. Overrides any style
	 * 		set by `params.category`.
	 * @param {boolean} [params.displayStem=true] Set to false to draw the marker at a specific
	 * 		point and not include the stem.
	 * @param {boolean} [params.invert=false] Set to true to invert the stem and point downward.
	 * @param {boolean} [params.infoOnLeft] If true, the information pop-up box is positioned on
	 * 		the left when possible.
	 * @param {number} [params.infoOffset] Distance to offset the information pop-up box.
	 *
	 * @constructor
	 * @name CIQ.Marker.stPerformance
	 * @since
	 * - 7.1.0
	 * - 7.2.0 Markers without <u>both</u> a `headline` and `story` are not interactive.
	 * 		You must provide either or both properties for a node (which is the marker pop-up
	 * 		display) to be appended to the DOM. Performance markers now can be positioned anywhere
	 * 		that a DOM marker can be positioned (above, below, or on a candle; at a value; or at
	 * 		the top or bottom of a chart).
	 * - 8.0.0 Added `params.infoOnLeft`, `params.infoOffset`, and `params.invert`.
	 *
	 *
	 * @example
	 * <caption>Required CSS entry for a custom category ("trade"), not included in the default
	 * CSS styles.</caption>
	 *
	 * .stx-marker.trade .stx-visual {
	 *     background: #C950d7;
	 *     width: 5px;
	 *     height: 5px;
	 * }
	 *
	 * // Corresponding code:
	 *
	 * new CIQ.Marker({
	 *     stx: stxx,
	 *     label: "trade",
	 *     xPositioner: "date",
	 *     x: OHLCData.DT,
	 *     node: new CIQ.Marker.stPerformance({
	 *         type: "circle",
	 *         category: "trade",
	 *         displayCategory: false,
	 *         displayStem: false,
	 *         headline: "Executed at $" + OHLCData.Close,
	 *         story: "Like all ChartIQ markers, the object itself is managed by the chart."
	 *     })
	 * });
	 */
	CIQ.Marker.stPerformance = function (params) {
		
		this.params = {
			displayCategory: true,
			displayStem: false,
			invert: false,
			story: "",
			headline: ""
		};
		CIQ.extend(this.params, params);
		var template = (this.template = document.createElement("TEMPLATE"));
		template.innerHTML =
			'<div class="stx-marker highlight">' +
				'<div class="stx-visual">' +
					'<div class="stx-marker-content">' +
						'<div class="stx-performance-marker stx-marker-expand"><h4></h4><p></p></div>' +
					"</div>" +
				"</div>" +
				'<div class="stx-stem"></div>' +
			"</div>";
			// '<div class="stx-marker highlight">' +
			// 	'<div class="stx-stem"></div>' +
			// 	'<div class="stx-visual"></div>' +
			// 	'<div class="stx-performance-marker stx-marker-expand"><h4></h4><p></p></div>' +
			// "</div>";
		var n = this.template.content.cloneNode(true);
		var marker = n.querySelector(".stx-marker", template);
		marker.classList.add(params.type);
		marker.classList.add(params.category);
		var visual = n.querySelector(".stx-visual", template);
		var expand = n.querySelector(".stx-marker-expand");
		var header = n.querySelector("h4", template);
		var text = n.querySelector("p", template);
		header.innerText = this.params.headline;
		text.innerText = this.params.story;
		this.hasText = !!params.headline || !!params.story;
		this.deferAttach = true;

		this.node = n.firstChild;
		this.node.params = this.params;
		this.visual = visual;
		this.expand = expand;
		if (params.type === "callout") {
			var h = expand.removeChild(header);
			n.querySelector(".stx-marker-content", template).insertBefore(h, expand);
		}
	};

	CIQ.inheritsFrom(CIQ.Marker.stPerformance, CIQ.Marker.NodeCreator, false);

	/**
	 * This function keeps you from having a ton of marker expand dialogs from overlapping each other and becoming too hard to read.
	 * Checks the markers that have been marked as highlighted by the chart engine and combines the text of their expands into the last one highlighted.
	 *
	 * @param {CIQ.ChartEngine} stx
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.consolidateExpanded = function (stx) {
		var highlighted = stx.markerHelper.highlighted;
		if (!highlighted.length) return;

		function findInner(marker) {
			var node = marker.params.node,
				expand = node.expand;
			if (!expand) return "";
			var inner = expand.style.display !== "none" ? expand.innerHTML : "";
			return inner;
		}

		var focusedMarker = highlighted[highlighted.length - 1],
			fnode = focusedMarker.params.node;
		if (!focusedMarker.consolidated) focusedMarker.consolidated = [];
		for (var i = highlighted.length - 2; i >= 0; i--) {
			var inner = findInner(highlighted[i]);
			var consolidated = "<consolidated>" + inner + "</consolidated>";
			if (inner.length) fnode.expand.innerHTML += consolidated;
		}
		focusedMarker.stxNodeCreator.quickCache(focusedMarker);
	};

	/**
	 * Resets any highlighted markers to their default display state and removes any consolidated text from the marker.
	 *
	 * @param {CIQ.ChartEngine} stx
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.reconstituteExpanded = function (stx) {
		var reset = stx.markerHelper.highlighted;
		if (!reset.length || !stx.activeMarker) return;
		reset = [stx.activeMarker];

		for (var i = reset.length - 1; i >= 0; i--) {
			var marker = reset[i];
			var node = marker.params.node,
				expand = node.expand;
			while (expand.lastElementChild.nodeName === "CONSOLIDATED") {
				expand.removeChild(expand.lastElementChild);
			}
		}
	};

	/**
	 * <span class="animation">Animation Loop</span>
	 *
	 * Iterates through all [high performance canvas]{@link CIQ.Marker.stPerformance} markers and
	 * draws them on the canvas.
	 *
	 * See {@tutorial Markers} tutorials for additional implementation instructions.
	 *
	 * @param {CIQ.ChartEngine} stx A reference to the chart object.
	 *
	 * @memberof CIQ.Marker.stPerformance
	 * @static
	 * @since 7.2.0 Replaces {@link CIQ.ChartEngine#drawMarkers}.
	 */
	CIQ.Marker.stPerformance.drawMarkers = function (stx) {
		var markers = stx.getMarkerArray("all");
		var chart = stx.chart;
		for (var i = 0; i < markers.length; i++) {
			var marker = markers[i],
				nodeCreator = marker.stxNodeCreator;
			var startingTick = chart.dataSegment[0].tick,
				endingTick = chart.dataSegment[chart.dataSegment.length - 1].tick;
			if (startingTick <= marker.tick <= endingTick) {
				// if markers are off screen don't draw them
				if (nodeCreator && nodeCreator.drawMarker)
					nodeCreator.drawMarker(marker);
			}
		}
	};

	/**
	 * Calculates the styles used in drawing [high performance canvas]{@link CIQ.Marker.stPerformance} markers.
	 * We use this method instead of other chart styling methods because Markers expect styles to cascade down and then be calculated.
	 * Other style methods are for adding or calculating a single property.
	 * This will save styles to the engine's style object where they can be adjusted with {@link CIQ.ChartEngine#setStyle}.
	 *
	 * @member CIQ.Marker.stPerformance
	 * @param {CIQ.ChartEngine} stx The chart engine.
	 * @param {CIQ.Marker} marker The marker to compute the styles from.
	 * @param {string} style Name to save to {@link CIQ.ChartEngine#styles}.
	 * @private
	 * @static
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.calculateMarkerStyles = function (stx, marker, style) {
		var testArea = document.querySelector(".stx-marker-templates");
		if (!testArea) {
			testArea = document.createElement("DIV");
			testArea.style.visibility = "hidden";
			testArea.style.left = "-1000px";
			document.body.append(testArea);
		}
		testArea.appendChild(marker.node);
		var s = getComputedStyle(marker.stxNodeCreator.visual);
		if (!stx.styles.stx_marker_stem) {
			var stem = getComputedStyle(
				document.querySelector(".stx-stem", marker.node)
			);
			stx.styles.stx_marker_stem = stx.cloneStyle(stem);
		}
		stx.styles[style] = stx.cloneStyle(s);
		testArea.removeChild(marker.node);
	};

	/**
	 * Draws circular canvas markers based on the styles for {@link CIQ.Marker.stPerformance} markers.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.drawCircleMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y,
			radius = params.radius,
			label = params.label;
		var color = params.color ? params.color : style.backgroundColor;

		// Draw Circle
		ctx.beginPath();
		ctx.setLineDash([]);
		ctx.lineWidth = 1;
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.font = "normal bold 12px Roboto, Helvetica, sans-serif";
		ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		// Write text
		if (label) {
			ctx.fillStyle = CIQ.colorsEqual("white", ctx.fillStyle)
				? "black"
				: "white";
			ctx.fillText(label.charAt(0).toUpperCase(), x - 4, y + 1);
		}

		if (marker.highlight || marker.active) {
			ctx.beginPath();
			ctx.arc(x, y, radius + 4, 0, 2 * Math.PI, false); // 4 pixels just chosen for giving slight space around marker
			ctx.stroke();
			ctx.closePath();
		}
	};

	CIQ.Marker.stPerformance.drawTriangleMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y,
			size = params.size*4,
			category = params.category;
		var color = params.color ? params.color : style.backgroundColor;
	
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.setLineDash([]);
		// Calculate triangle vertices
		const height = (Math.sqrt(3) / 2) * size; // Height of an equilateral triangle formula
		const halfSide = size / 2;

		if(category == 'buy' || category == 'buy-2'){
			ctx.moveTo(x, y - height / 3); // 以 (x, y) 为中心点
			ctx.lineTo(x - halfSide, y + (2 * height) / 3);
			ctx.lineTo(x + halfSide, y + (2 * height) / 3);
		}else {
			ctx.moveTo(x, y + height / 3); // 以 (x, y) 为中心点
			ctx.lineTo(x - halfSide, y - (2 * height) / 3);
			ctx.lineTo(x + halfSide, y - (2 * height) / 3);	
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	

	
		if (marker.highlight || marker.active) {
			// Highlight or active state
			size = size * 1.5
			
			const height = (Math.sqrt(3) / 2) * size; // Height of an equilateral triangle formula
			const halfSide = size / 2;

			if(category == 'buy' || category == 'buy-2'){
				y = y + 1.6
				ctx.moveTo(x, y - height / 2);
				ctx.lineTo(x - halfSide, y + height / 2);
				ctx.lineTo(x + halfSide, y + height / 2);
			}else {
				y = y - 1.6
				ctx.moveTo(x, y + height / 2);
				ctx.lineTo(x - halfSide, y - height / 2);
				ctx.lineTo(x + halfSide, y - height / 2);
			}

			ctx.closePath();
			ctx.stroke();
		}
	};

	CIQ.Marker.stPerformance.drawHollowTriangleMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y,
			size = params.size * 4,
			category = params.category;
		var color = params.color ? params.color : style.backgroundColor;
		
		// 设置描边颜色，移除 fillStyle
		ctx.strokeStyle = color; // 使用 color 作为空心三角形的描边颜色
		ctx.lineWidth = 2;
	
		// --- 1. 绘制基本（空心）三角形 ---
		ctx.beginPath();
		ctx.setLineDash([]);
		// 计算三角形顶点
		const height = (Math.sqrt(3) / 2) * size; // 等边三角形的高度
		const halfSide = size / 2;
	
		if(category == 'buy' || category == 'buy-2'){
			// 向上（买入）三角形
			ctx.moveTo(x, y - height / 3); // 以 (x, y) 为中心点
			ctx.lineTo(x - halfSide, y + (2 * height) / 3);
			ctx.lineTo(x + halfSide, y + (2 * height) / 3);
		} else {
			// 向下（卖出）三角形
			ctx.moveTo(x, y + height / 3); // 以 (x, y) 为中心点
			ctx.lineTo(x - halfSide, y - (2 * height) / 3);
			ctx.lineTo(x + halfSide, y - (2 * height) / 3); 
		}
		
		ctx.closePath();
		// 关键改变：移除 ctx.fill(); 
		ctx.stroke(); // 仅描边，使之为空心
	
		// --- 2. 高亮或激活状态绘制（外框）---
		if (marker.highlight || marker.active) {
			// Highlight or active state
			
			// 增加尺寸
			size = size * 1.5; 
			
			// 重新计算高亮尺寸的几何参数
			const height = (Math.sqrt(3) / 2) * size;
			const halfSide = size / 2;
	
			ctx.beginPath(); // 开始新的路径，避免与上一个三角形路径混合
	
			if(category == 'buy' || category == 'buy-2'){
				// 向上（买入）三角形 - 注意这里的坐标计算略有不同，可能是为了偏移外框
				y = y + 1.6;
				ctx.moveTo(x, y - height / 2);
				ctx.lineTo(x - halfSide, y + height / 2);
				ctx.lineTo(x + halfSide, y + height / 2);
			} else {
				// 向下（卖出）三角形
				y = y - 1.6;
				ctx.moveTo(x, y + height / 2);
				ctx.lineTo(x - halfSide, y - height / 2);
				ctx.lineTo(x + halfSide, y - height / 2);
			}
	
			ctx.closePath();
			// 再次描边，绘制高亮时的外层空心三角形
			ctx.stroke(); 
		}
	};

	CIQ.Marker.stPerformance.drawSignalMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y,
			width = params.midWidth * 2, // 使用宽度参数
			height = params.midHeight * 2, // 使用高度参数
			//category = params.category;
			// headline = params.headline;
			label = 'Last Signal'
		var color = params.color ? params.color : style.backgroundColor;
	
		var labelLength = Math.round(ctx.measureText(label).width);

		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.beginPath();
	
		// 绘制一个长矩形，(x, y) 为中心点
		ctx.rect(x - width / 2, y - height / 2, width, height);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

    // 绘制倒三角形
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2 - 3); // 矩形底部中心
	ctx.lineTo(x - 10, y + height / 2 - 3); // 三角形左角
    ctx.lineTo(x, y + height / 2 + 10 - 3); // 三角形左角
    ctx.lineTo(x + 10, y + height / 2 - 3); // 三角形右角
    ctx.lineTo(x, y + height / 2 - 3); // 回到中心点
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

		var xx = (width - (labelLength + 20)) / 2;
		ctx.fillStyle = "black";
		ctx.fillText(label, x - width / 2 + xx + 10, y);
	
		if (marker.highlight || marker.active) {
			// Highlight or active state
			width = width * 1.1;
			height = height * 1.3;
	
			ctx.beginPath();
				y = y + 1.6;
				ctx.rect(x - width / 2, y - height / 2, width, height);
			ctx.closePath();
			ctx.stroke();
		}
	};
	
	/**
	 * Draws square canvas markers based on the styles for {@link CIQ.Marker.stPerformance} markers.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.drawSquareMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y,
			half = params.half,
			label = params.label;
		var color = params.color ? params.color : style.backgroundColor;
		var whole = half * 2;

		// Draw Square
		ctx.beginPath();
		ctx.setLineDash([]);
		ctx.lineWidth = 1;
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.font = "normal bold 12px Roboto, Helvetica, sans-serif";
		ctx.rect(x - half, y - half, whole, whole);
		ctx.fill();
		if (marker.highlight || marker.active)
			ctx.rect(x - half - 4, y - half - 4, whole + 8, whole + 8); // whole + 4 + 4 for the highlighted box
		ctx.stroke();
		ctx.closePath();

		// Write text
		if (label) {
			ctx.fillStyle = CIQ.colorsEqual("white", ctx.fillStyle)
				? "black"
				: "white";
			ctx.fillText(label.charAt(0).toUpperCase(), x - 4, y + 1);
		}
	};

	/**
	 * Draws callout (rectangular) canvas marker based on the style for a {@link CIQ.Marker.stPerformance} markers.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.drawCalloutMarker = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context,
			mParams = marker.params;
		var x = params.x,
			y = params.y,
			half = params.half,
			calloutMid = params.midWidth,
			headline = params.headline;
		var color = params.color ? params.color : style.backgroundColor;

		var height = half * 2 || 25;
		var headlineLength = Math.round(ctx.measureText(headline).width);
		// If there's no length use the text measurement plus some padding
		var calloutWidth = calloutMid ? calloutMid * 2 : headlineLength + 8;

		// Draw the rectangle
		ctx.beginPath();
		ctx.setLineDash([]);
		ctx.lineWidth = 1;
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.font = "normal bold 12px Roboto, Helvetica, sans-serif";
		ctx.rect(mParams.box.x0, mParams.box.y0, calloutWidth, height);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		// draw the "background" box that text apears in
		ctx.beginPath();
		ctx.fillStyle =
			marker.highlight || marker.active
				? "rgba(255,255,255,0.8)"
				: "rgba(255,255,255,0.65)";
		var xx = (calloutWidth - (headlineLength + 20)) / 2;
		ctx.rect(mParams.box.x0 + xx, y - half, headlineLength + 40, 22);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		ctx.fillStyle = "black";
		ctx.fillText(headline, mParams.box.x0 + xx + 10, y);
	};

	/**
	 * Draws marker stems for a based on a style for {@link CIQ.Marker.stPerformance} markers.
	 *
	 * @param {CIQ.Marker} marker
	 * @param {object} style
	 * @param {object} params
	 * @static
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.drawMarkerStem = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y;

		ctx.beginPath();
		ctx.strokeStyle = style.borderLeftColor;
		// ctx.setLineDash(CIQ.borderPatternToArray(stemStyle.borderLeftWidth, stemStyle.borderLeftStyle));
		ctx.setLineDash([1, 1]);
		let stemHeight = CIQ.stripPX(style.height);
		let startY = params.invert ? marker.params.box.y0 : marker.params.box.y1;
		let endY = params.invert
			? marker.params.box.y0 - stemHeight
			: marker.params.box.y1 + stemHeight;
		ctx.moveTo(x, startY);
		ctx.lineTo(x, endY);
		ctx.stroke();
		ctx.closePath();
	};

	CIQ.Marker.stPerformance.drawMarkerStemTriangle = function (marker, style, params) {
		var stx = marker.params.stx,
			chart = stx.chart,
			ctx = chart.context;
		var x = params.x,
			y = params.y;

		ctx.beginPath();
		ctx.strokeStyle = style.borderLeftColor;
		// ctx.setLineDash(CIQ.borderPatternToArray(stemStyle.borderLeftWidth, stemStyle.borderLeftStyle));
		ctx.setLineDash([]);
		let startY = params.invert ? marker.params.box.y0 : marker.params.box.y1;
		let endY = chart.height;
		ctx.moveTo(x, startY);
		ctx.lineTo(x, endY);
		ctx.stroke();
		ctx.closePath();
	};

	/**
	 * Draws a canvas marker on the chart and positions the pop-up for the marker if necessary.
	 *
	 * @memberof CIQ.Marker.stPerformance
	 * @param {CIQ.Marker} marker The marker to be drawn.
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.drawMarker = function (marker) {
		var mParams = marker.params,
			stx = marker.params.stx;
		if (!stx) return;

		var chart = stx.chart,
			dataSegment = chart.dataSegment;
		if (!dataSegment.length) return;

		var panel = stx.panels[marker.params.panelName];
		var nParams = marker.stxNodeCreator.params;
		var type = nParams.type,
			category = nParams.category,
			headline = nParams.headline,
			display = nParams.displayCategory,
			color = nParams.color,
			invert = nParams.invert;
		var style = "stx_marker_" + type + "_" + category;
		if (!stx.styles[style])
			CIQ.Marker.stPerformance.calculateMarkerStyles(stx, marker, style);
		var markerStyle = (marker.style = stx.styles[style]),
			stemStyle = stx.styles.stx_marker_stem;
		if(nParams.category == 'buy'){
			stemStyle.borderLeftColor = '#1afa29'
			stemStyle.marginBottom = '-10px'
		}else if(nParams.category == 'buy-2') {
			stemStyle.borderLeftColor = '#92d2cc'
			stemStyle.marginBottom = '0px'
		}else if(nParams.category == 'sell'){
			stemStyle.borderLeftColor = '#d81e06'
			stemStyle.marginBottom = '0px'
		}else if(nParams.category == 'sell-2'){
			stemStyle.borderLeftColor = '#ff5290'
			stemStyle.marginBottom = '0px'
		}

		var halfSide = parseInt(markerStyle.height, 10) / 2,
			halfWidth = parseInt(markerStyle.width, 10) / 2;
		var stemHeight = nParams.displayStem
			? parseInt(stemStyle.height, 10) + parseInt(stemStyle.marginBottom, 10)
			: 0;

		var markerHeight = stemHeight + parseInt(markerStyle.height, 10);
		var stemOffset = stemHeight ? stemHeight + halfSide : 0;

		var x = stx.pixelFromDate(mParams.x);
		var y = mParams.node.calculateYPosition({
			marker: marker,
			panel: panel,
			height: markerHeight,
			half: halfSide,
			offset: stemOffset,
			inverted: invert,
			field: mParams.plotField	// <<<<== custom field
		});
		if(type === "last-signal") y = y-50

		// This can happen if for some reason the marker is missing a tick.
		//It's possible but rare,  in that scenario just abort the drawing to prevent throwing errors
		if (!marker.tick && marker.tick !== 0) return;

		mParams.box = {
			x0: x - (halfWidth || halfSide),
			y0: y - halfSide,
			x1: x + (halfWidth || halfSide),
			y1: y + halfSide,
			midY: halfSide,
			midX: halfWidth || halfSide,
			stemHeight: stemHeight
		};

		if (!display) category = display;
		stx.startClip(panel.name);

		if (type === "circle") {
			CIQ.Marker.stPerformance.drawCircleMarker(marker, markerStyle, {
				x: x,
				y: y,
				radius: halfSide,
				label: category,
				color: color
			});
		} else if (type === "square") {
			CIQ.Marker.stPerformance.drawSquareMarker(marker, markerStyle, {
				x: x,
				y: y,
				half: halfSide,
				label: category,
				color: color
			});
		} else if (type === "callout") {
			CIQ.Marker.stPerformance.drawCalloutMarker(marker, markerStyle, {
				x: x,
				y: y,
				half: halfSide,
				midWidth: halfWidth,
				headline: headline,
				color: color
			});
		} else if (type === "triangle") {
			CIQ.Marker.stPerformance.drawTriangleMarker(marker, markerStyle, {
				x: x,
				y: y,
				size: halfSide,
				category: nParams.category,
				color: color
			});
		} else if (type === "triangle-hollow") {
			CIQ.Marker.stPerformance.drawHollowTriangleMarker(marker, markerStyle, {
				x: x,
				y: y,
				size: halfSide,
				category: nParams.category,
				color: color
			});
		} else if (type === "last-signal") {
			CIQ.Marker.stPerformance.drawSignalMarker(marker, markerStyle, {
				x: x,
				y: y,
				midHeight: halfSide,
				midWidth: halfWidth,
				color: color
			});
		} else {
			console.warn(
				"Marker type: " +
					type +
					" is unsupported with canvas markers!\nSupported Styles are Square, Circle, and Callout."
			);
		}

		if (nParams.displayStem)
			if (type === "triangle") {
				// CIQ.Marker.stPerformance.drawMarkerStemTriangle(marker, stemStyle, {
				// 	x: x,
				// 	y: y,
				// 	invert: invert
				// });
				CIQ.Marker.stPerformance.drawMarkerStem(marker, stemStyle, {
					x: x,
					y: y,
					invert: invert
				});
			} else {
				CIQ.Marker.stPerformance.drawMarkerStem(marker, stemStyle, {
					x: x,
					y: y,
					invert: invert
				});
			}

		stx.endClip();
		if (marker.attached) this.positionPopUpNode(marker);
	};

	/**
	 * Positions a marker's pop-up `div` that has been appended to the chart so that it follows the canvas marker.
	 * This is the replacement for {@link CIQ.ChartEngine#positionDOMMarkers}, but it is now an instance method for the individual performance marker.
	 *
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.positionPopUpNode = function (marker) {
		if (!marker.attached || !marker.params.box) return;
		var mparams = marker.params,
			stx = mparams.stx,
			mbox = mparams.box,
			expand = marker.params.node.expand;
		var dataSet = stx.chart.dataSet,
			dataSegment = stx.chart.dataSegment;

		var markerVisible;
		if (marker.tick) {
			var startBuffer = [
				dataSet[dataSegment[0] && dataSegment[0].tick - 1],
				dataSet[dataSegment[0] && dataSegment[0].tick - 2]
			]; // check two ticks ahead the dataSegment b/c markers sometimes extend past ticks
			var first = stx.getFirstLastDataRecord(
				startBuffer.concat(dataSegment),
				"Date"
			);
			var endBuffer = [
				dataSet[dataSegment[dataSegment.length - 1].tick + 1],
				dataSet[dataSegment[dataSegment.length - 1].tick + 2]
			]; // check two ticks behind the dataSegment b/c markers sometimes extend past ticks
			var last = stx.getFirstLastDataRecord(
				dataSegment.concat(endBuffer),
				"Date",
				true
			);
			markerVisible =
				first.DT <= dataSet[marker.tick].DT &&
				dataSet[marker.tick].DT <= last.DT;
		} else {
			markerVisible = false;
		}

		if (!marker.highlight && !marker.active) markerVisible = false;
		expand.style.visibility = markerVisible ? "" : "hidden";
		if (!markerVisible) return; // don't continue if the marker is off the screen

		var panel = stx.panels[mparams.panelName];
		var expandRect = expand.rects;
		var medianHeight = expandRect.height / 2;

		var tx;
		var offset = marker.node.params.infoOffset || 0;
		if (marker.node.params.infoOnLeft) {
			tx =
				mbox.x0 - expandRect.width - offset < panel.left
					? mbox.x1 + offset
					: mbox.x0 - expandRect.width - offset;
		} else {
			tx =
				mbox.x0 + expandRect.width > panel.right
					? mbox.x0 - expandRect.width - offset
					: mbox.x1 + offset;
		}
		tx -= stx.chart.left;
		var ty =
			mbox.y0 - medianHeight >= panel.top
				? mbox.y0 + mbox.midY - medianHeight
				: mbox.y0;
		// case where the marker is set to "bottom" alignment. We make the marker flush with the bottom of the yAxis unless the expand height is shorter than the marker height (ie a short marker label on a marker with a stem)
		if (
			!mparams.avoidFlush &&
			mbox.y1 + mbox.stemHeight === panel.yAxis.bottom &&
			expandRect.height > mbox.y1 - mbox.y0 + mbox.stemHeight
		)
			ty = mbox.y1 - expandRect.height + mbox.stemHeight;
		ty -= stx.chart.panel.top;
		var transform =
			"translateX(" +
			Math.floor(tx) +
			"px) translateY(" +
			Math.floor(ty) +
			"px) translateZ(0)";
		expand.style.transform = transform;
		// cache values for later use to determine x/y location of the expand popup
		expand.transform = { translateX: tx, translateY: ty };
	};

	/**
	 * Performs and caches some necessary calculations when the expand popup is first appended to the DOM.
	 * We do these calculations here once instead of on every call of the draw loop when we iterate thru the markers.
	 * The only thing that will change is the X/Y transform position which we already calculate in CIQ.Marker.stPerformance#drawMarker.
	 * So we can safely add the transform values we cache there to the default X/Y calculated here and find position without trashing the layout.
	 *
	 * **NOTE** You will notice that if you remove a marker and add it back, the values should be correct for X/Y (or at least the same as what it was before + translateX/Y).
	 * While this is true, it's only true if you add a marker back, so we can't reliably assume that the values are correct for X/Y.
	 *
	 * @param {CIQ.Marker} marker
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.quickCache = function (marker) {
		var node = marker.params.node,
			expand = node.expand,
			style = marker.style;
		var notScroll =
			CIQ.stripPX(style.marginLeft) +
			CIQ.stripPX(style.marginRight) +
			CIQ.stripPX(style.borderRight) +
			CIQ.stripPX(style.borderLeft);
		expand.rects = expand.getBoundingClientRect();
		expand.scrollBarWidth = expand.rects.width - expand.clientWidth - notScroll;
	};

	/**
	 * Calculates the initial y-axis positioning when drawing a canvas marker.
	 *
	 * @param {object} params
	 * @param {CIQ.Marker} params.marker The marker for which the y-axis position is calculated.
	 * @param {CIQ.ChartEngine.Panel} params.panel Panel on which the marker appears.
	 * @param {number} params.tick The tick of the quote in the chart's data set.
	 * @param {number} params.height Total height of the marker as defined by marker height plus
	 * 		stem height.
	 * @param {number} params.half Half the height of the marker as defined by the marker CSS
	 * 		style.
	 * @param {number} params.offset Height of the marker stem offset as defined by the marker
	 * 		stem CSS style height plus margin bottom.
	 * @param {boolean} params.inverted Indicates whether the marker stem is inverted; that is,
	 * 		pointing downward.
	 * @return {number} Initial y-coordinate positioning for drawing the canvas marker.
	 *
	 * @memberof CIQ.Marker.stPerformance
	 * @since
	 * - 7.2.0
	 * - 8.0.0 Added `params.inverted`.
	 */
	// CIQ.Marker.stPerformance.prototype.calculateYPosition = function (params) {
	// 	var marker = params.marker,
	// 		panel = params.panel,
	// 		height = params.height,
	// 		side = params.half,
	// 		offset = params.offset,
	// 		inverted = params.inverted;
	// 	var stx = marker.params.stx,
	// 		chart = stx.chart;

	// 	// this code finds the actual tick or the one right before to put the marker on.
	// 	var useHighs = stx.chart.highLowBars;
	// 	var quote = chart.dataSet[marker.tick];
	// 	if (!quote) return;

	// 	var price = useHighs ? quote.High : quote.Close;
	// 	var position = marker.params.yPositioner,
	// 		y;
	// 	switch (position) {
	// 		case "value": // this is actuallly our default case
	// 			if (marker.params.y || marker.params.y === 0)
	// 				y = stx.pixelFromPrice(marker.params.y, panel) - height * 0.5 + side;
	// 			else y = stx.pixelFromPrice(price, panel) - offset;
	// 			break;
	// 		case "above_candle":
	// 			y = stx.pixelFromPrice(price, panel) - offset;
	// 			break;
	// 		case "below_candle":
	// 			y = stx.pixelFromPrice(quote.Low || price, panel);
	// 			if (inverted && offset) y += offset;
	// 			else y += side;
	// 			break;
	// 		case "on_candle":
	// 			var h = quote.High || quote.Close,
	// 				l = quote.Low || quote.Low === 0 || quote.Close;
	// 			y = stx.pixelFromPrice((h + l) / 2, panel) - height * 0.5 + side;
	// 			break;
	// 		case "top":
	// 			y = stx.pixelFromPrice(panel.yAxis.high, panel);
	// 			if (inverted && offset) y += offset;
	// 			else y += side;
	// 			break;
	// 		case "bottom":
	// 			y = stx.pixelFromPrice(panel.yAxis.low, panel) - (offset || side); // if no stem offset use half so the whole marker is above the axis
	// 			break;
	// 		default:
	// 			break;
	// 	}
	// 	return y;
	// };

	/***************************** dynamically set the y axis location for each marker as needed, for dual symbol markers ********************************/
	CIQ.Marker.stPerformance.prototype.calculateYPosition = function (params) {
		var marker = params.marker,
			stx = marker.params.stx,
			chart = stx.chart,
			field = params.field,
			panel = params.panel,
			yAxis = params.yAxis || stx.getYAxisByField(panel, field) || panel.yAxis,
			height = params.height,
			side = params.half,
			offset = params.offset,
			stemHeight = params.stemHeight,
			inverted = params.inverted;
	
		// this code finds the actual tick or the one right before to put the marker on.
		var useHighs = stx.chart.highLowBars;

		var quote = chart.dataSet[marker.tick];
		if (!quote) return;
	
		var position = marker.params.yPositioner,
			y;
	
		var getPixel = stx.pixelFromPrice.bind(stx);
		if (
			quote.transform &&
			field in quote.transform &&
			yAxis === stx.chart.yAxis &&
			position !== "value"
		) {
			quote = quote.transform;
			getPixel = stx.pixelFromTransformedValue.bind(stx);
		}
		if (quote && field) quote = quote[field];
		if (typeof quote === "number") {
			quote = { Close: quote };
			quote[chart.defaultPlotField] = quote.Close;
			useHighs = false;
		}
		if (!quote) return;
	
		var bounds = stx.getBarBounds(quote, !!field);
		var high = useHighs
			? bounds[yAxis.flipped ? "low" : "high"]
			: quote[chart.defaultPlotField];
		var low = useHighs
			? bounds[yAxis.flipped ? "high" : "low"]
			: quote[chart.defaultPlotField];
	
		if (isNaN(high)) high = (yAxis.high + yAxis.low) / 2;
		if (isNaN(low)) low = (yAxis.high + yAxis.low) / 2;
	
		var bottomAdjust = 0;
		if (position != "none") {
			var isLane = position.indexOf("_lane") > -1;
			var placementMap = stx.markerHelper.placementMap?stx.markerHelper.placementMap: {};
			var keyBase = position + "|" + panel.name + "|" + field;
			if (isLane && placementMap[keyBase] === undefined)
				placementMap[keyBase] = 2;
			var placementKey =
				keyBase + "-" + (isLane ? marker.params.label : marker.tick);
			if (placementMap[placementKey] === undefined) {
				placementMap[placementKey] = isLane ? placementMap[keyBase] : 0;
				if (isLane) placementMap[keyBase] += height + 2;
			}
			bottomAdjust = placementMap[placementKey];
			if (!isLane) placementMap[placementKey] += height + 1;
		}
	
		switch (position) {
			case "value": // this is actually our default case
				if (marker.params.y || marker.params.y === 0) {
					y = getPixel(marker.params.y, panel, yAxis) - height * 0.5 + side;
					break;
				} /* falls through */
			case "above_candle":
				y =
					getPixel(high, panel, yAxis) -
					side -
					((!inverted && stemHeight) || offset) -
					bottomAdjust;
				break;
			case "below_candle":
				y =
					getPixel(low, panel, yAxis) +
					side +
					((inverted && stemHeight) || offset) +
					bottomAdjust;
				break;
			case "on_candle":
				y = getPixel((high + low) / 2, panel, yAxis) - height * 0.5 + side;
				break;
			case "top":
			case "top_lane":
				y =
					panel.yAxis.top +
					side +
					((inverted && stemHeight) || offset) +
					bottomAdjust;
				break;
			case "bottom":
			case "bottom_lane":
				y =
					panel.yAxis.bottom -
					side -
					((!inverted && stemHeight) || offset) -
					bottomAdjust;
				break;
			default:
				break;
		}
		return (Math.round(2 * y) || 0) / 2;
	};
	/***************************************************************************************/

	/**
	 * Method to setup the actual DOM node that gets appended to the chart for Performance markers.
	 * Performance markers require the entire DOM of the template for the styles to be calculated correctly but we only want to append the "pop-up" expand `div`.
	 *
	 * @param {CIQ.Marker} marker The marker to which this node belongs.
	 * @return {HTMLElement} Expand the pop-up node that will be appended to the chart for the performance marker.
	 * @private
	 */
	CIQ.Marker.stPerformance.prototype.prepareForHolder = function (marker) {
		var expand = this.expand,
			stx = marker.params.stx;
		expand.classList.add(this.params.type);
		stx.markerHelper.domMarkers.push(marker);
		return expand;
	};

	/**
	 * Adds click and touch events to the marker pop-up when it is appended to the chart.
	 *
	 * @param {CIQ.Marker} marker
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.addToHolder = function (marker) {
		var expand = this.expand,
			stx = marker.params.stx;

		CIQ.Marker.stPerformance.reconstituteExpanded(stx);
		/** important!! 禁用marker expand 融合機制*/
		//CIQ.Marker.stPerformance.consolidateExpanded(stx);
		this.quickCache(marker);

		if (expand.clickClosure) return;

		function clickClosure(e) {
			stx.activeMarker = marker;
			stx.activeMarker.click({
				cx: e.clientX,
				cy: e.clientY,
				panel: stx.currentPanel
			});
			e.stopPropagation();
		}
		// CIQ.safeClickTouch, in this case, attaches clickClosure to the pointerup event
		// Attaching the listener explicitly here to ensure stopPropagation and prevent accidental triggering of other markers
		expand.addEventListener("mousedown", clickClosure);
		expand.addEventListener("touchstart", clickClosure, { passive: false });
		expand.clickClosure = clickClosure;
	};

	/**
	 * Removes a high performance canvas markers from the `markerHelper.domMarkers` array.
	 * We use this instead of {@link CIQ.ChartEngine#removeFromHolder} because that will remove the whole marker instead of just removing the DOM node.
	 *
	 * @private
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.remove = function (marker) {
		var stx = marker.params.stx;
		if (!stx) return;
		if (!stx.markerHelper.domMarkers) return; // if never anything appended return

		var idx = stx.markerHelper.domMarkers.indexOf(marker);
		if (idx != -1) stx.markerHelper.domMarkers.splice(idx, 1);
		if (marker.attached) {
			var panel = stx.panels[marker.params.panelName];
			var expand = marker.params.node.expand;
			if (expand.parentNode === panel.subholder)
				panel.subholder.removeChild(expand);
			expand.removeEventListener("click", expand.clickClosure);
		}
	};

	/**
	 * Click event handler for performance markers when they are clicked in the canvas.
	 * Adds or removes the marker's pop-up expand `div` to the chart, depending on whether it has already been activated.
	 *
	 * @memberof CIQ.Marker.stPerformance
	 * @param {object} params Configuration parameters.
	 * @param {number} params.cx Client x-coordinate of click.
	 * @param {number} params.cy Client y-coordinate of click.
	 * @param {CIQ.Marker} params.marker Marker that was clicked.
	 * @param {CIQ.ChartEngine.Panel} params.panel Panel where the click occurred.
	 * @since 7.2.0
	 */
	CIQ.Marker.stPerformance.prototype.click = function (params) {
		if (!this.hasText) return; // don't display anything if there's nothing to display!

		if (typeof arguments[0] === "number") {
			params = {
				cx: arguments[0],
				cy: arguments[1],
				marker: arguments[2],
				panel: arguments[3]
			};
		}
		const { cx, cy, marker, panel } = params;
		var stx = marker.params.stx;

		var position;
		if (marker.attached) {
			var expand = this.expand;
			// checks to see if we clicked on the scroll bar and if we did return
			if (
				expand.rects.width -
					expand.scrollBarWidth +
					expand.transform.translateX <
					stx.backOutX(cx) &&
				stx.backOutX(cx) < expand.rects.width + expand.transform.translateX
			)
				return;
			this.remove(marker);
		} else {
			stx.addToHolder(marker);
			position = true;
		}
		marker.attached = !marker.attached;
		marker.active = !marker.active;
		if (position) marker.stxNodeCreator.positionPopUpNode(marker);
	};
}

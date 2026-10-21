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


import { CIQ as _CIQ } from "../../../js/chartiq.js";
import "../../standard/studies.js";


let __js_advanced_studies_volumeProfile_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"volumeProfile feature requires first activating studies feature."
	);
} else {
	/**
	 * Creates a volume profile underlay for the chart. The underlay is always 25% of the width of the chart.
	 * The color is determined by the 'sd.outputs["Bars Color"]' parameter and opacity and border colors can be controlled with the class stx_volume_profile
	 * NOTE: Volume Profile will only display on the chart panel sharing the yAxis.
	 */

	CIQ.Studies.displayVolumeProfile = function (stx, sd, quotes) {
		if (!stx || !stx.chart.dataSet) return;

		var chart = stx.chart;

		var numberBars = sd.parameters.numberOfBars;
		var widthPercentage = sd.parameters.widthPercentage;
		var displayBorder = sd.parameters.displayBorder;
		var displayVolume = sd.parameters.displayVolume;
		//set defaults
		if (!numberBars || numberBars < 0) numberBars = 30;
		numberBars = Math.ceil(numberBars);
		if (!widthPercentage || widthPercentage < 0) widthPercentage = 0.25;
		if (displayBorder !== false) displayBorder = true;
		if (displayVolume !== true) displayVolume = false;
		//decide how many bars
		var interval = (chart.highValue - chart.lowValue) / numberBars;
		if (interval === 0) return;
		var priceVolArry = [];

		// set the boundaries for the bars -- add .1 to the loop to account for possible rounding errors.
		for (var j = chart.lowValue; j < chart.highValue + 0.1; j += interval) {
			priceVolArry.push([j, 0]);
		}

		if (priceVolArry.length < 2) {
			// need at least 2 price data points to draw boxes
			stx.displayErrorAsWatermark(
				"chart",
				stx.translateIf("Not enough data to render the Volume Profile")
			);
			return;
		}

		var volumeMax = 0; // this is the maximum volume after we group them by the bars we will draw
		for (var i = 0; i < quotes.length; i++) {
			var prices = quotes[i];
			if (!prices) continue;
			var volume = prices.Volume;
			if (sd.panel == chart.name && prices.transform) prices = prices.transform;

			var bottomRange = priceVolArry[0][0];
			var topRange = 0;
			for (var x = 1; x < priceVolArry.length; x++) {
				topRange = priceVolArry[x][0];
				if (
					(prices.Low >= bottomRange && prices.Low <= topRange) ||
					(prices.Low < bottomRange && prices.High > topRange) ||
					(prices.High >= bottomRange && prices.High <= topRange)
				) {
					priceVolArry[x][1] += volume;
					if (priceVolArry[x][1] > volumeMax) volumeMax = priceVolArry[x][1];
				}
				bottomRange = topRange;
			}
		}
		if (volumeMax === 0) {
			stx.displayErrorAsWatermark(
				"chart",
				stx.translateIf("Not enough data to render the Volume Profile")
			);
			return;
		}

		stx.setStyle(
			"stx_volume_profile",
			"color",
			CIQ.Studies.determineColor(sd.outputs["Bars Color"])
		);
		var context = sd.getContext(stx);
		var fontstyle = "stx-float-date";
		stx.canvasFont(fontstyle, context);
		var txtHeight = stx.getCanvasFontSize(fontstyle);
		var panel = chart.panel;
		var chartBottom = panel.yAxis.bottom;
		var barBottom = Math.round(chart.right) - 0.5; //bottom x coordinate for the bar  -- remember bars are sideways so the bottom is on the x axis
		var barMaxHeight = chart.width * widthPercentage; // pixels for highest bar
		var borderColor = stx.canvasStyle("stx_volume_profile").borderTopColor;
		var bordersOn =
			!CIQ.isTransparent(
				stx.canvasStyle("stx_volume_profile").borderTopColor
			) && displayBorder;

		var self = stx;

		function drawBars(volumeProfileClass, borders) {
			if (!borders) barBottom -= 2;
			self.canvasColor(volumeProfileClass);
			context.beginPath();
			var bottomRange = priceVolArry[0][0];
			var prevTop = barBottom;
			for (var i = 1; i < priceVolArry.length; i++) {
				if (priceVolArry[i][1]) {
					var barTop =
						Math.round(
							barBottom - (priceVolArry[i][1] * barMaxHeight) / volumeMax
						) - 0.5;
					var bottomRangePixel =
						Math.round(self.pixelFromTransformedValue(bottomRange, panel)) +
						0.5;
					var topRangePixel =
						Math.round(
							self.pixelFromTransformedValue(priceVolArry[i][0], panel)
						) + 0.5;

					if (!borders) {
						bottomRangePixel -= 0.5;
						topRangePixel += 0.5;
						barTop += 0.5;
					}

					if (bottomRangePixel > chartBottom) bottomRangePixel = chartBottom;
					if (topRangePixel < chartBottom) {
						context.moveTo(barBottom, bottomRangePixel);
						context.lineTo(barBottom, topRangePixel);
						context.lineTo(barTop, topRangePixel);
						context.lineTo(barTop, bottomRangePixel);
						if (borders) {
							if (prevTop > barTop || i == 1)
								context.lineTo(prevTop, bottomRangePixel); // draw down to the top of the previous bar, so that we don't overlap strokes
						} else {
							context.lineTo(barBottom, bottomRangePixel);
							if (displayVolume) {
								//write the volume on the bar **/
								var txt = CIQ.condenseInt(priceVolArry[i][1]);
								var barHeight = bottomRangePixel - topRangePixel;
								if (txtHeight <= barHeight - 2) {
									var width;
									try {
										width = context.measureText(txt).width;
									} catch (e) {
										width = 0;
									} // Firefox doesn't like this in hidden iframe
									context.textBaseline = "top";
									var tmpcolor = context.fillStyle;
									context.fillStyle = borderColor;
									context.fillText(
										txt,
										barTop - width - 3,
										topRangePixel + (barHeight / 2 - txtHeight / 2)
									);
									context.fillStyle = tmpcolor;
								}
							}
						}
					}
					prevTop = barTop;
				} else {
					prevTop = barBottom; // there will be a missing bar here so the border needs to once again go to the end
				}
				bottomRange = priceVolArry[i][0];
			}
			if (!sd.highlight && stx.highlightedDraggable) context.globalAlpha *= 0.3;
			if (!borders) context.fill();
			context.strokeStyle = borderColor;
			if (borders) context.stroke();
			context.closePath();
		}

		drawBars("stx_volume_profile", false);
		if (bordersOn) {
			drawBars("stx_volume_profile", true);
		}

		context.globalAlpha = 1;
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"vol profile": {
			name: "Volume Profile",
			underlay: true,
			seriesFN: CIQ.Studies.displayVolumeProfile,
			calculateFN: null,
			inputs: {},
			outputs: { "Bars Color": "#b64a96" },
			customRemoval: true,
			parameters: {
				init: {
					displayBorder: true,
					displayVolume: false,
					numberOfBars: 30,
					widthPercentage: 0.25
				}
			},
			attributes: {
				yaxisDisplayValue: { hidden: true },
				panelName: { hidden: true },
				flippedEnabled: { hidden: true }
			}
		}
	});
}

};
__js_advanced_studies_volumeProfile_(typeof window !== "undefined" ? window : global);

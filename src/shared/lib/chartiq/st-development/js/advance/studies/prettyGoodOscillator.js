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


let __js_advanced_studies_prettyGoodOscillator_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"prettyGoodOscillator feature requires first activating studies feature."
	);
} else {
	CIQ.Studies.calculatePrettyGoodOscillator = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}

		CIQ.Studies.MA("exponential", sd.days, "trueRange", 0, "_EMA", stx, sd);
		CIQ.Studies.MA("simple", sd.days, "Close", 0, "_SMA", stx, sd);

		for (var i = Math.max(1, sd.startFrom); i < quotes.length; i++) {
			if (!quotes[i]["_SMA " + sd.name] || !quotes[i]["_EMA " + sd.name])
				continue;
			quotes[i]["Result " + sd.name] =
				(quotes[i].Close - quotes[i]["_SMA " + sd.name]) /
				quotes[i]["_EMA " + sd.name];
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"Pretty Good": {
			name: "Pretty Good Oscillator",
			calculateFN: CIQ.Studies.calculatePrettyGoodOscillator,
			parameters: {
				init: {
					studyOverZonesEnabled: true,
					studyOverBoughtValue: 3,
					studyOverBoughtColor: process.env.VUE_APP_RED,
					studyOverSoldValue: -3,
					studyOverSoldColor: process.env.VUE_APP_GREEN
				}
			}
		}
	});
}

};
__js_advanced_studies_prettyGoodOscillator_(typeof window !== "undefined" ? window : global);

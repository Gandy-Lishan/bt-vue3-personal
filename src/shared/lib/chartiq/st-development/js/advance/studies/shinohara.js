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


let __js_advanced_studies_shinohara_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("shinohara feature requires first activating studies feature.");
} else {
	CIQ.Studies.calculateShinohara = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}
		var accums = {
			weakNum: 0,
			weakDen: 0,
			strongNum: 0,
			strongDen: 0
		};
		if (sd.startFrom > 1) {
			accums = CIQ.clone(quotes[sd.startFrom - 1]["_accums " + sd.name]);
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
			accums.weakNum += quotes[i].High - quotes[i].Close;
			accums.weakDen += quotes[i].Close - quotes[i].Low;
			if (i > 0) {
				accums.strongNum += quotes[i].High - quotes[i - 1].Close;
				accums.strongDen += quotes[i - 1].Close - quotes[i].Low;
			}
			if (i >= sd.days) {
				accums.weakNum -= quotes[i - sd.days].High - quotes[i - sd.days].Close;
				accums.weakDen -= quotes[i - sd.days].Close - quotes[i - sd.days].Low;
				quotes[i]["Weak Ratio " + sd.name] =
					(100 * accums.weakNum) / accums.weakDen;
				if (i > sd.days) {
					accums.strongNum -=
						quotes[i - sd.days].High - quotes[i - sd.days - 1].Close;
					accums.strongDen -=
						quotes[i - sd.days - 1].Close - quotes[i - sd.days].Low;
					quotes[i]["Strong Ratio " + sd.name] =
						(100 * accums.strongNum) / accums.strongDen;
				}
			}
			quotes[i]["_accums " + sd.name] = CIQ.clone(accums);
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		Shinohara: {
			name: "Shinohara Intensity Ratio",
			calculateFN: CIQ.Studies.calculateShinohara,
			inputs: { Period: 26 },
			outputs: { "Strong Ratio": "#E99B54", "Weak Ratio": "#5F7CB8" }
		}
	});
}

};
__js_advanced_studies_shinohara_(typeof window !== "undefined" ? window : global);

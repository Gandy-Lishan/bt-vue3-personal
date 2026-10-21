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
import { getPropertyByString } from "@/utils/globalFunc"


let __js_advanced_studies_ehlerFisher_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"ehlerFisher feature requires first activating studies feature."
	);
} else {
	CIQ.Studies.calculateEhlerFisher = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
				var field	// 它是流动的
				if(sd.parameters.isComparison){
					field = CIQ.store.getters.getComparisonSymbol.url
					quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
				}else{
					quotes = sd.chart.scrubbed
				}
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}

		function getLLVHHV(p, x) {
			var l = Number.MAX_VALUE,
				h = Number.MAX_VALUE * -1;
			for (var j = x - p + 1; j <= x; j++) {
				var d = (getPropertyByString(quotes[j],field,'High') + getPropertyByString(quotes[j],field,'Low')) / 2;
				l = Math.min(l, d);
				h = Math.max(h, d);
			}
			return [l, h];
		}

		var n = 0;
		if (sd.startFrom > 1) n = quotes[sd.startFrom - 1]["_n " + sd.name];
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (quote.futureTick) break;
			if (i < sd.days - 1) {
				quote["EF " + sd.name] = quote["EF Trigger " + sd.name] = n;
				continue;
			}
			var lh = getLLVHHV(sd.days, i);
			n =
				0.33 *
					2 *
					(((getPropertyByString(quotes[i],field,'High') + getPropertyByString(quotes[i],field,'Low')) / 2 - lh[0]) /
						Math.max(0.000001, lh[1] - lh[0]) -
						0.5) +
				0.67 * n;
			if (n > 0) n = Math.min(n, 0.9999);
			else if (n < 0) n = Math.max(n, -0.9999);
			var previous = i ? quotes[i - 1]["EF " + sd.name] : 0;
			quote["EF " + sd.name] =
				0.5 * Math.log((1 + n) / (1 - n)) + 0.5 * previous;
			quote["EF Trigger " + sd.name] = previous;
			quote["_n " + sd.name] = n;
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"Ehler Fisher": {
			name: "Ehler Fisher Transform",
			calculateFN: CIQ.Studies.calculateEhlerFisher,
			inputs: { Period: 10 },
			outputs: { EF: "auto", "EF Trigger": "#FF0000" }
		}
	});
}

};
export {__js_advanced_studies_ehlerFisher_}
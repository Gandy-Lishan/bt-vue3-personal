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


let __js_advanced_studies_easeOfMovement_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"easeOfMovement feature requires first activating studies feature."
	);
} else {
	CIQ.Studies.calculateEaseOfMovement = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field	// 它是流动的
		if(sd.parameters.isComparison){
			field = CIQ.store.getters.getComparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}
		if (quotes.length < sd.days) {
			sd.error = true;
			return;
		}

		for (var i = Math.max(1, sd.startFrom); i < quotes.length; i++) {
			var avgCurrent = (getPropertyByString(quotes[i],field,'High') + getPropertyByString(quotes[i],field,'Low')) / 2;
			var avgPrior = (getPropertyByString(quotes[i - 1],field,'High') + getPropertyByString(quotes[i - 1],field,'Low')) / 2;
			var dm = avgCurrent - avgPrior;
			var br = getPropertyByString(quotes[i],field,'Volume') / 100000000 / (getPropertyByString(quotes[i],field,'High') - getPropertyByString(quotes[i],field,'Low'));
			var result = dm / br;
			if (!isFinite(result)) quotes[i]["_EOM1 " + sd.name] = NaN;
			//With NaN, the study plotter will plot from the previous point
			//directly to the next point after the current tick. Infinity was making the
			//study not plot in the panel at all while the data point was in dataSegement.
			else quotes[i]["_EOM1 " + sd.name] = result;
		}
		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			"_EOM1 " + sd.name,
			0,
			"Result",
			stx,
			sd
		);
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		EOM: {
			name: "Ease of Movement",
			seriesFN: function (stx, sd, quotes) {
				stx.dualSymbolCalculationErrorWatermark(stx, sd, quotes)
				CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);
			},
			calculateFN: CIQ.Studies.calculateEaseOfMovement,
			inputs: { Period: 14, "Moving Average Type": "ma" }
		}
	});
}

};
export {__js_advanced_studies_easeOfMovement_}

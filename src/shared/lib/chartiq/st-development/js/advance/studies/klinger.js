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


let __js_advanced_studies_klinger_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("klinger feature requires first activating studies feature.");
} else {
	/**
	 * Calculate function for klinger
	 * @param  {CIQ.ChartEngine} stx Chart object
	 * @param {CIQ.Studies.StudyDescriptor} sd  Study Descriptor
	 * @memberOf CIQ.Studies
	 */
	CIQ.Studies.calculateKlinger = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var shortCycle = Number(sd.inputs["Short Cycle"]);
		var longCycle = Number(sd.inputs["Long Cycle"]);

				var _field	// 它是流动的
				if(sd.parameters.isComparison){
					_field = CIQ.store.getters.getComparisonSymbol.url
					quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(_field))
				}else{
					quotes = sd.chart.scrubbed
				}
		if (quotes.length < Math.max(shortCycle, longCycle) + 1) {
			sd.error = true;
			return;
		}

		var field = sd.name + "_hist",
			klinger = "Klinger " + sd.name,
			klingerSignal = "KlingerSignal " + sd.name,
			signedVolume = "_SV " + sd.name,
			shortEMA = "_EMA-S " + sd.name,
			longEMA = "_EMA-L " + sd.name,
			i;
		for (i = Math.max(1, sd.startFrom); i < quotes.length; i++) {
			var sv = getPropertyByString(quotes[i],_field,'Volume');
			if (getPropertyByString(quotes[i],_field,'hlc/3') < getPropertyByString(quotes[i - 1],_field,'hlc/3')) sv *= -1;
			if (sv) quotes[i][signedVolume] = sv;
		}

		CIQ.Studies.MA(
			"exponential",
			shortCycle,
			signedVolume,
			0,
			"_EMA-S",
			stx,
			sd
		);
		CIQ.Studies.MA(
			"exponential",
			longCycle,
			signedVolume,
			0,
			"_EMA-L",
			stx,
			sd
		);

		for (i = Math.max(longCycle, sd.startFrom); i < quotes.length; i++) {
			console.log('quotes[i]',quotes[i].futureTick,quotes[i][shortEMA],quotes[i][longEMA])
			if (
				quotes[i].futureTick ||
				quotes[i][shortEMA] === null ||
				quotes[i][longEMA] === null
			)
				continue;
			quotes[i][klinger] = quotes[i][shortEMA] - quotes[i][longEMA];
		}

		CIQ.Studies.MA(
			"exponential",
			Number(sd.inputs["Signal Periods"]),
			klinger,
			0,
			"KlingerSignal",
			stx,
			sd
		);

		for (i = sd.startFrom; i < quotes.length; i++) {
			quotes[i][field] = quotes[i][klinger] - quotes[i][klingerSignal];
		}
		sd.outputMap[field] = "";
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		Klinger: {
			name: "Klinger Volume Oscillator",
			seriesFN: function (stx, sd, quotes) {
				stx.dualSymbolCalculationErrorWatermark(stx, sd, quotes)
				CIQ.Studies.displayHistogramWithSeries(stx, sd, quotes);
			},
			//seriesFN: CIQ.Studies.displayHistogramWithSeries,
			calculateFN: CIQ.Studies.calculateKlinger,
			inputs: { "Signal Periods": 13, "Short Cycle": 34, "Long Cycle": 55 },
			outputs: {
				Klinger: "auto",
				KlingerSignal: "#FF0000",
				"Increasing Bar": "#00DD00",
				"Decreasing Bar": "#FF0000"
			}
		}
	});
}

};
export {__js_advanced_studies_klinger_}

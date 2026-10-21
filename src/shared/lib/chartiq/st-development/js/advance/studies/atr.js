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


let __js_advanced_studies_atr_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("atr feature requires first activating studies feature.");
} else {
	CIQ.Studies.calculateATRBands = function (stx, sd) {
		if(sd.parameters.isComparison){
			/**根据criteria动态设定study的Y轴属*******/
			var actualXaxis = stx.getYAxisByField(stx.panels['chart'], CIQ.store.getters.getComparisonSymbol.url);
			sd.yAxis = actualXaxis
			/****************** */
		}else{
			sd.yAxis = null
		}

		CIQ.Studies.calculateStudyATR(stx, sd);
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		CIQ.Studies.calculateGenericEnvelope(
			stx,
			sd,
			sd.inputs.Shift,
			field,
			"ATR " + sd.name
		);
	};

	CIQ.Studies.calculateSTARCBands = function (stx, sd) {
		if(sd.parameters.isComparison){
			/**根据criteria动态设定study的Y轴属*******/
			var actualXaxis = stx.getYAxisByField(stx.panels['chart'], CIQ.store.getters.getComparisonSymbol.url);
			sd.yAxis = actualXaxis
			/****************** */
		}else{
			sd.yAxis = null
		}

		CIQ.Studies.calculateStudyATR(stx, sd);
		CIQ.Studies.MA(
			"simple",
			sd.inputs["MA Period"],
			"Close",
			0,
			"_MA",
			stx,
			sd
		);
		CIQ.Studies.calculateGenericEnvelope(
			stx,
			sd,
			sd.inputs.Multiplier,
			"_MA " + sd.name,
			"ATR " + sd.name
		);
	};

	CIQ.Studies.calculateATRStops = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		if (!quotes) return;
		CIQ.Studies.calculateStudyATR(stx, sd);
				var field	// 它是流动的
				if(sd.parameters.isComparison){
					field = CIQ.store.getters.getComparisonSymbol.url
					/**根据criteria动态设定study的Y轴属*******/
					var actualXaxis = stx.getYAxisByField(stx.panels['chart'], field);
					sd.yAxis = actualXaxis
					/****************** */
					quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
				}else{
					sd.yAxis = null
					quotes = sd.chart.scrubbed
				}

		var useHighLow = sd.inputs.HighLow;
		for (var i = Math.max(sd.startFrom - 1, 1); i < quotes.length - 1; i++) {
			var prices = quotes[i];
			var pd = quotes[i - 1];
			var prev = prices["Buy Stops " + sd.name];
			if (!prev) prev = prices["Sell Stops " + sd.name];
			if (!prev) prev = 0;
			if (!prices || !pd) continue;
			var base = getPropertyByString(prices,field,'Close');
			var result = base;
			var offset = prices["ATR " + sd.name] * sd.inputs.Multiplier;
					/** dual symbol features */
					const pricesClose = getPropertyByString(prices,field,'Close');
					const pricesHigh = getPropertyByString(prices,field,'High');
					const pricesLow = getPropertyByString(prices,field,'Low');
					const pdClose = getPropertyByString(pd,field,'Close');
					/*************** */
			if (pricesClose > prev && pdClose > prev) {
				if (useHighLow) base = pricesHigh;
				result = Math.max(prev, base - offset);
			} else if (pricesClose <= prev && pdClose <= prev) {
				if (useHighLow) base = pricesLow;
				result = Math.min(prev, base + offset);
			} else if (pricesClose > prev) {
				if (useHighLow) base = pricesHigh;
				result = base - offset;
			} else if (pricesClose <= prev) {
				if (useHighLow) base = pricesLow;
				result = base + offset;
			}
			if (base <= result) {
				quotes[i + 1]["Buy Stops " + sd.name] = result;
				delete quotes[i + 1]["Sell Stops " + sd.name];
			} else if (base > result) {
				quotes[i + 1]["Sell Stops " + sd.name] = result;
				delete quotes[i + 1]["Buy Stops " + sd.name];
			}
			quotes[i + 1]["All Stops " + sd.name] = result;
		}
		sd.referenceOutput = "All Stops"; //so PSAR2 can draw a square wave
		sd.outputMap = {};
		sd.outputMap["All Stops " + sd.name] = "";
	};
// CIQ.Studies.calculateATRStops = function (stx, sd) {
// 	var quotes = sd.chart.scrubbed;
// 	if (!quotes) return;
// 	CIQ.Studies.calculateStudyATR(stx, sd);
// 	var useHighLow = sd.inputs.HighLow;
// 	for (var i = Math.max(sd.startFrom - 1, 1); i < quotes.length - 1; i++) {
// 		var prices = quotes[i];
// 		var pd = quotes[i - 1];
// 		var prev = prices["Buy Stops " + sd.name];
// 		if (!prev) prev = prices["Sell Stops " + sd.name];
// 		if (!prev) prev = 0;
// 		if (!prices || !pd) continue;
// 		var base = prices.Close;
// 		var result = base;
// 		var offset = prices["ATR " + sd.name] * sd.inputs.Multiplier;
// 		if (prices.Close > prev && pd.Close > prev) {
// 			if (useHighLow) base = prices.High;
// 			result = Math.max(prev, base - offset);
// 		} else if (prices.Close <= prev && pd.Close <= prev) {
// 			if (useHighLow) base = prices.Low;
// 			result = Math.min(prev, base + offset);
// 		} else if (prices.Close > prev) {
// 			if (useHighLow) base = prices.High;
// 			result = base - offset;
// 		} else if (prices.Close <= prev) {
// 			if (useHighLow) base = prices.Low;
// 			result = base + offset;
// 		}
// 		if (base <= result) {
// 			quotes[i + 1]["Buy Stops " + sd.name] = result;
// 			delete quotes[i + 1]["Sell Stops " + sd.name];
// 		} else if (base > result) {
// 			quotes[i + 1]["Sell Stops " + sd.name] = result;
// 			delete quotes[i + 1]["Buy Stops " + sd.name];
// 		}
// 		quotes[i + 1]["All Stops " + sd.name] = result;
// 	}
// 	sd.referenceOutput = "All Stops"; //so PSAR2 can draw a square wave
// 	sd.outputMap = {};
// 	sd.outputMap["All Stops " + sd.name] = "";
// };
	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		/** 无需处理dual symbol */
		ATR: {
			name: "Average True Range",
			calculateFN: CIQ.Studies.calculateStudyATR,
			outputs: { ATR: "auto" }
		},
		"ATR Bands": {
			name: "ATR Bands",
			overlay: true,
			seriesFN: CIQ.Studies.displayChannel,
			calculateFN: CIQ.Studies.calculateATRBands,
			inputs: { Period: 5, Field: "field", Shift: 3, "Channel Fill": true },
			// outputs: {
			// 	"ATR Bands Top": "auto",
			// 	"ATR Bands Bottom": "auto",
			// 	"ATR Bands Channel": "auto"
			// },
			outputs: {
				"ATR Bands Top": "auto",
				"ATR Bands Median": "auto",
				"ATR Bands Bottom": "auto"
			},
			attributes: {
				Shift: { min: 0.1, step: 0.1 }
			}
		},
		"STARC Bands": {
			name: "STARC Bands",
			overlay: true,
			seriesFN: CIQ.Studies.displayChannel,
			calculateFN: CIQ.Studies.calculateSTARCBands,
			inputs: {
				Period: 15,
				"MA Period": 5,
				Multiplier: 1.3,
				"Channel Fill": true
			},
			outputs: {
				"STARC Bands Top": "auto",
				"STARC Bands Median": "auto",
				"STARC Bands Bottom": "auto"
			},
			attributes: {
				Multiplier: { min: 0.1, step: 0.1 }
			}
		},
		"ATR Trailing Stop": {
			name: "ATR Trailing Stops",
			overlay: true,
			seriesFN: CIQ.Studies.displayPSAR2,
			calculateFN: CIQ.Studies.calculateATRStops,
			inputs: {
				Period: 21,
				Multiplier: 3,
				"Plot Type": ["points", "squarewave"],
				HighLow: false
			},
			outputs: { "Buy Stops": "#FF0000", "Sell Stops": "#00FF00" },
			attributes: {
				Multiplier: { min: 0.1, step: 0.1 }
			}
		}
	});
}

};
export {__js_advanced_studies_atr_}

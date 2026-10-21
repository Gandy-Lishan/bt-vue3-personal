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


let __js_advanced_studies_chaikin_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("chaikin feature requires first activating studies feature.");
} else {
	CIQ.Studies.calculateChaikinMoneyFlow = function (stx, sd) {
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
		var sumMoneyFlow = 0,
			sumVolume = 0;
		var startQuote = quotes[sd.startFrom - 1];
		if (startQuote) {
			if (startQuote["_sumMF " + sd.name])
				sumMoneyFlow = startQuote["_sumMF " + sd.name];
			if (startQuote["_sumV " + sd.name])
				sumVolume = startQuote["_sumV " + sd.name];
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
				var quotesClose = getPropertyByString(quotes[i],field,'Close')
				var quotesHigh = getPropertyByString(quotes[i],field,'High')
				var quotesLow = getPropertyByString(quotes[i],field,'Low')
				var quotesVolume = getPropertyByString(quotes[i],field,'Volume')
			if (quotesHigh == quotesLow) quotes[i]["_MFV " + sd.name] = 0;
			else
				quotes[i]["_MFV " + sd.name] =
					(quotesVolume *
						(2 * quotesClose - quotesHigh - quotesLow)) /
					(quotesHigh - quotesLow);
			sumMoneyFlow += quotes[i]["_MFV " + sd.name];
			sumVolume += quotesVolume;
			if (i > sd.days - 1) {
				sumMoneyFlow -= quotes[i - sd.days]["_MFV " + sd.name];
				sumVolume -= getPropertyByString(quotes[i - sd.days],field,'Volume');
				if (sumVolume)
					quotes[i]["Result " + sd.name] = sumMoneyFlow / sumVolume;
			}
			quotes[i]["_sumMF " + sd.name] = sumMoneyFlow;
			quotes[i]["_sumV " + sd.name] = sumVolume;
		}
	};

	CIQ.Studies.calculateChaikinVolatility = function (stx, sd) {
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
		var i;
		for (i = sd.startFrom; i < quotes.length; i++) {
			if (quotes[i].futureTick) break;
				var quotesHigh = getPropertyByString(quotes[i],field,'High')
				var quotesLow = getPropertyByString(quotes[i],field,'Low')
			quotes[i]["_High-Low " + sd.name] = quotesHigh - quotesLow;
		}
		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			"_High-Low " + sd.name,
			0,
			"_MA",
			stx,
			sd
		);

		var roc = sd.inputs["Rate Of Change"];
		if (!roc) roc = sd.days;
		for (i = Math.max(sd.startFrom, roc); i < quotes.length; i++) {
			if (!quotes[i - roc]["_MA " + sd.name]) continue;
			if (quotes[i].futureTick) break;
			quotes[i]["Result " + sd.name] =
				100 *
				(quotes[i]["_MA " + sd.name] / quotes[i - roc]["_MA " + sd.name] - 1);
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"Chaikin MF": {
			name: "Chaikin Money Flow",
			seriesFN: function (stx, sd, quotes) {
				stx.dualSymbolCalculationErrorWatermark(stx, sd, quotes)
				CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);
			},
			calculateFN: CIQ.Studies.calculateChaikinMoneyFlow,
			inputs: { Period: 20 }
		},
		"Chaikin Vol": {
			name: "Chaikin Volatility",
			seriesFN: function (stx, sd, quotes) {
				stx.dualSymbolCalculationErrorWatermark(stx, sd, quotes)
				CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);
			},
			calculateFN: CIQ.Studies.calculateChaikinVolatility,
			inputs: { Period: 14, "Rate Of Change": 2, "Moving Average Type": "ma" }
		}
	});
}

};
export {__js_advanced_studies_chaikin_}

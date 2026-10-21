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


let __js_advanced_studies_rsi_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("rsi feature requires first activating studies feature.");
} else {
	/**
	 * Default study calculation function for RSI study.
	 *
	 * The resulting values will be added to the dataSet using the field name provided by the `sd.outputMap` entry.
	 *
	 * **Notes:**
	 * - This function calculates a single value, so it expects `sd.outputMap` to contain a single mapping.
	 * - If no `outputs` object is defined in the library entry, the study will default to a single output named `Result`, which will then be used in lieu of `sd.outputs` to build the field name.
	 * - The study name may contain the unprintable character `&zwnj;`, see {@link studyDescriptor} documentation.
	 *
	 * @param {CIQ.ChartEngine} stx A chart engine instance
	 * @param {CIQ.Studies.StudyDescriptor} sd A study descriptor
	 * @memberOf CIQ.Studies
	 * @since 6.3.0 RSI can now be calculated on any field instead of just "Close".
	 */
	CIQ.Studies.calculateRSI = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		//var showSupLine = sd.parameters.showSupLine?sd.parameters.showSupLine:null
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field
		/** 
		 * 用isComparison属性判断Study用来计算的数据源
		 * 不能用criteria判断,要是加了有些判断就没法锁定目的study（比如csv）
		 * ma和roc就是用critria判断Study用来计算的数据源
		 *  */
		if(sd.parameters.isComparison){
			field = CIQ.store.getters.getComparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}

		function computeRSI(avgGain, avgLoss) {
			if (avgLoss === 0) return 100;
			var rs = avgGain / avgLoss;
			return 100 - 100 / (1 + rs);
		}
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if (!i) continue;
			var quote = quotes[i];
			var quote1 = quotes[i - 1];
			var quoteVal = getPropertyByString(quote,field,subField);
			var quote1Val = getPropertyByString(quote1,field,subField);
			if (!quoteVal && quoteVal !== 0) continue;
			if (!quote1Val && quote1Val !== 0) continue;
			var change = quoteVal - quote1Val;
			var num = Math.min(i, sd.days);

			var avgGain = quote1["_avgG " + sd.name];
			if (!avgGain) avgGain = 0;
			avgGain -= avgGain / num;

			var avgLoss = quote1["_avgL " + sd.name];
			if (!avgLoss) avgLoss = 0;
			avgLoss -= avgLoss / num;

			if (change > 0) {
				avgGain += change / num;
			} else if (change <= 0) {
				avgLoss -= change / num;
			} else continue;
			if (i >= sd.days) {
				if ((avgGain || avgGain !== 0) && (avgLoss || avgLoss !== 0))
					quote["RSI " + sd.name] = computeRSI(avgGain, avgLoss);
			}
			//intermediates
			quote["_avgG " + sd.name] = avgGain;
			quote["_avgL " + sd.name] = avgLoss;
			//quote['supLine'] = showSupLine
		}
		//sd.zoneOutput = "RSI";
		sd.outputMap["RSI " + sd.name] = "RSI";
		//sd.outputMap['supLine'] = "supLine";
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		rsi: {
			name: "Relative Strength Index (RSI)",
			inputs: { Period: 14, Field: "field" },
			seriesFN: function (stx, sd, quotes) {
				CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);
		
				var showSupLine = (!sd.parameters.showSupLine && sd.parameters.showSupLine!=0)?null:sd.parameters.showSupLine
				var yAxis = CIQ.stxx.panels[sd.panel].yAxis
				CIQ.Studies.drawHorizontal(stx, sd, null, showSupLine, yAxis);
			},
			calculateFN: CIQ.Studies.calculateRSI,
			range: "0 to 100",
			outputs: { RSI: "auto" },
			parameters: {
				init: {
					studyOverZonesEnabled: true,
					studyOverBoughtValue: 80,
					studyOverBoughtColor: process.env.VUE_APP_RED,
					studyOverSoldValue: 20,
					studyOverSoldColor: process.env.VUE_APP_GREEN
				}
			}
		}
	});
}

};
export {__js_advanced_studies_rsi_}

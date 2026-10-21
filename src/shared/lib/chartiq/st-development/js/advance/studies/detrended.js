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


let __js_advanced_studies_detrended_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("detrended feature requires first activating studies feature.");
} else {
	CIQ.Studies.calculateDetrendedPrice = function (stx, sd) {
		var quotes = sd.chart.scrubbed;

		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		var subField = field
	
		var offset = Math.floor(sd.days / 2 + 1);
		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			field,
			-offset,
			"MA",
			stx,
			sd
		);

		/** 
		 * 用isComparison属性判断Study用来计算的数据源
		 * 不能用criteria判断,要是加了有些判断就没法锁定目的study（比如csv）
		 * ma和roc就是用critria判断Study用来计算的数据源
		 *  */
		if(sd.parameters.isComparison){
			field = CIQ.store.getters.getComparisonSymbol.url
			//filter valid rows
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else {
			quotes = sd.chart.scrubbed
		}
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}

		for (
			var i = Math.max(sd.days - offset - 1, sd.startFrom - offset);
			i < quotes.length - offset;
			i++
		) {
			if (i < 0) continue;
			var val = quotes[i][field];
			if (val && typeof val == "object") val = val[subField];
			var maVal = quotes[i]["MA " + sd.name];
			if ((val || val === 0) && (maVal || maVal === 0))
				quotes[i]["Result " + sd.name] = val - maVal;
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		Detrended: {
			name: "Detrended Price Oscillator",
			calculateFN: CIQ.Studies.calculateDetrendedPrice,
			inputs: { Period: 14, Field: "field", "Moving Average Type": "ma" }
		}
	});
}

};
export {__js_advanced_studies_detrended_}

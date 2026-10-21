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


let __js_advanced_studies_volatilityIndex_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"volatilityIndex feature requires first activating studies feature."
	);
} else {
	CIQ.Studies.calculateRelativeVolatility = function (stx, sd) {
		sd.days = Number(sd.inputs["Smoothing Period"]);
		var smoothing = Number(sd.inputs["STD Period"]);
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field


		function computeRVI(avgGain, avgLoss) {
			if (avgGain + avgLoss === 0) return 100;
			return (100 * avgGain) / (avgGain + avgLoss);
		}

		sd.std = new CIQ.Studies.StudyDescriptor(sd.name, "sdev", sd.panel);
		sd.std.chart = sd.chart;
		sd.std.days = smoothing;
		sd.std.startFrom = sd.startFrom;
		sd.std.inputs = { Field: field, "Standard Deviations": 1, Type: "ma" };
		sd.std.outputs = { _STD: null };

			// dual symbol new features
			sd.std.parameters = sd.parameters

		CIQ.Studies.calculateStandardDeviation(stx, sd.std);

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
				if (quotes.length < sd.days + smoothing) {
					sd.error = true;
					return;
				}

		var avgGain = 0;
		var avgLoss = 0;
		if (sd.startFrom > 1) {
			avgGain = quotes[sd.startFrom - 1]["_avgG " + sd.name] || 0;
			avgLoss = quotes[sd.startFrom - 1]["_avgL " + sd.name] || 0;
		}
		for (var i = Math.max(sd.startFrom, sd.days); i < quotes.length; i++) {
			var quote = quotes[i],
				quote1 = quotes[i - 1];
			var quoteVal = getPropertyByString(quote,field,subField);
			var quote1Val = getPropertyByString(quote1,field,subField);
			if (!quoteVal && quoteVal !== 0) continue;
			if (!quote1Val && quote1Val !== 0) continue;
			if (!quote["_STD " + sd.name] && quote["_STD " + sd.name] !== 0) continue;
			if (quoteVal > quote1Val) {
				avgGain =
					(avgGain * (sd.days - 1) + quote["_STD " + sd.name]) / sd.days;
				avgLoss = (avgLoss * (sd.days - 1)) / sd.days;
			} else {
				avgLoss =
					(avgLoss * (sd.days - 1) + quote["_STD " + sd.name]) / sd.days;
				avgGain = (avgGain * (sd.days - 1)) / sd.days;
			}
			quote["Rel Vol " + sd.name] = computeRVI(avgGain, avgLoss);
			quote["_avgG " + sd.name] = avgGain;
			quote["_avgL " + sd.name] = avgLoss;
		}
		sd.zoneOutput = "Rel Vol";
	};

	CIQ.Studies.calculateHistoricalVolatility = function (stx, sd) {
		function intFactor(days) {
			if (isNaN(days)) days = 365;
			if (stx.layout.interval == "day") return days;
			else if (stx.layout.interval == "week") return 52;
			else if (stx.layout.interval == "month") return 12;
			return days;
		}
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
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

		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}

		var mult = sd.inputs["Standard Deviations"];
		if (mult < 0) mult = 1;
		var annualizingFactor =
			100 * Math.sqrt(intFactor(sd.inputs["Days Per Year"])) * mult;

		var arr = [];
		var accum = 0;
		if (sd.startFrom > 1) {
			accum = getPropertyByString(quotes[sd.startFrom - 1],field,"_state " + sd.name)[0];
			arr = getPropertyByString(quotes[sd.startFrom - 1],field,"_state " + sd.name)[1].slice();
			// accum = quotes[sd.startFrom - 1]["_state " + sd.name][0];
			// arr = quotes[sd.startFrom - 1]["_state " + sd.name][1].slice();
		}
		for (var i = Math.max(1, sd.startFrom); i < quotes.length; i++) {
			var denom = getPropertyByString(quotes[i - 1],field,subField);
			if (denom) {
				var ln = Math.log(getPropertyByString(quotes[i],field,subField) / denom);
				arr.push(ln);
				accum += ln;
				if (i >= sd.days) {
					var d2 = 0;
					accum /= sd.days;
					for (var j = 0; j < arr.length; j++) {
						d2 += Math.pow(arr[j] - accum, 2);
					}
					accum *= sd.days;
					accum -= arr.shift();
					quotes[i]["Result " + sd.name] =
						Math.sqrt(d2 / sd.days) * annualizingFactor;
				}
			}
			quotes[i]["_state " + sd.name] = [accum, arr.slice()];
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"Hist Vol": {
			name: "Historical Volatility",
			calculateFN: CIQ.Studies.calculateHistoricalVolatility,
			inputs: {
				Period: 10,
				Field: "field",
				"Days Per Year": [252, 365],
				"Standard Deviations": 1
			},
			attributes: {
				"Standard Deviations": { min: 0.1, step: 0.1 }
			}
		},
		"Rel Vol": {
			name: "Relative Volatility",
			range: "0 to 100",
			calculateFN: CIQ.Studies.calculateRelativeVolatility,
			inputs: { Field: "field", "STD Period": 10, "Smoothing Period": 14 },
			outputs: { "Rel Vol": "auto" },
			centerline: 50,
			parameters: {
				init: {
					studyOverZonesEnabled: true,
					studyOverBoughtValue: 70,
					studyOverBoughtColor: process.env.VUE_APP_RED,
					studyOverSoldValue: 30,
					studyOverSoldColor: process.env.VUE_APP_GREEN
				}
			}
		}
	});
}

};
export {__js_advanced_studies_volatilityIndex_}

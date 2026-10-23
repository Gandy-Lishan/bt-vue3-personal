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


let __js_advanced_studies_cci_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("cci feature requires first activating studies feature.");
} else {
	CIQ.Studies.calculateCCI = function (stx, sd) {
		/** 默认情况下中间量会预先计算并储存在dataSet内,但计算函数传值是scrubbed，存在无symbol2的情况，于是我在tech的计算函数内先装载中间量 */
		CIQ.stxx.calculateTypicalPrice(sd.chart)

		var quotes = sd.chart.scrubbed
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var field = "hlc/3"
		var subField = field

		CIQ.Studies.MA("simple", sd.days, field, 0, "MA", stx, sd);
		/** 
		 * 用isComparison属性判断Study用来计算的数据源
		 * 不能用criteria判断,要是加了有些判断就没法锁定目的study（比如csv）
		 * ma和roc就是用critria判断Study用来计算的数据源
		 *  */
		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol.url
			//filter valid rows
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else {
			quotes = sd.chart.scrubbed
		}
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}
	
		for (var i = Math.max(sd.startFrom, sd.days - 1); i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			var md = 0;
			for (var j = 0; j < sd.days; j++) {
				md += Math.abs(getPropertyByString(quotes[i - j],field,subField) - quote["MA " + sd.name]);
			}
			md /= sd.days;
			if (Math.abs(md) < 0.00000001) quote["Result " + sd.name] = 0;
			else
				quote["Result " + sd.name] =
					(getPropertyByString(quote,field,subField) - quote["MA " + sd.name]) / (0.015 * md);
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		cci: {
			name: "Commodity Channel Index",
			calculateFN: CIQ.Studies.calculateCCI,
			inputs: { Period: 21 },
			parameters: {
				init: {
					studyOverZonesEnabled: true,
					studyOverBoughtValue: 100,
					studyOverBoughtColor: process.env.VUE_APP_RED,
					studyOverSoldValue: -100,
					studyOverSoldColor: process.env.VUE_APP_GREEN
				}
			},
			attributes: {
				Period: { min: 2 }
			}
		}
	});
}

};
export {__js_advanced_studies_cci_}

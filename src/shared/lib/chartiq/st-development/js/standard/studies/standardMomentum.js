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


let __js_standard_studies_momentum_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error("momentum feature requires first activating studies feature.");
} else {
	/**
	 * Calculate function for Rate Of Change related studies. Price ROC, Volume ROC and Momentum.
	 *
	 * The resulting values will be added to the dataSet using the field name provided by the `sd.outputMap` entry.
	 *
	 * **Notes:**
	 * - This function calculates a single value, so it expects `sd.outputMap` to contain a single mapping.
	 * - If no `outputs` object is defined in the library entry, the study will default to a single output named `Result`, which will then be used in lieu of `sd.outputs` to build the field name.
	 * - The study name may contain the unprintable character `&zwnj;`, see {@link studyDescriptor} documentation.
	 *
	 * @param  {CIQ.ChartEngine} stx Chart object
	 * @param  {CIQ.Studies.StudyDescriptor} sd  Study Descriptor
	 * @memberof CIQ.Studies
	 */
	CIQ.Studies.calculateRateOfChange = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		if (sd.parameters.isVolume) field = "Volume";
		var subField = field

		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}
		if (quotes.length < sd.days + 1) {
			sd.error = true;
			return;
		}

		var name = sd.name;
		for (var p in sd.outputs) {
			name = p + " " + name;
		}

		var offset = sd.inputs["Center Line"];
		if (!offset) offset = 0;
		else offset = parseInt(offset, 10);

		for (var i = Math.max(sd.startFrom, sd.days); i < quotes.length; i++) {
			var currentVal = quotes[i][field];
			if (currentVal && typeof currentVal == "object")
				currentVal = currentVal[subField];
			var pastVal = quotes[i - sd.days][field];
			if (pastVal && typeof pastVal == "object") pastVal = pastVal[subField];
			if (sd.type == "Momentum")
				quotes[i][name] = currentVal - pastVal + offset;
			else {
				var denom = pastVal;
				if (denom) {
					// skip if denominator is 0 --
					quotes[i][name] = 100 * (currentVal / denom - 1) + offset;
				}
			}
		}
	};

	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"Price ROC": {
			name: "Price Rate of Change",
			calculateFN: CIQ.Studies.calculateRateOfChange,
			inputs: { Period: 14, Field: "field" }
		},
		Momentum: {
			name: "Momentum Indicator",
			calculateFN: CIQ.Studies.calculateRateOfChange,
			inputs: { Period: 14 },
			centerline: 0
		}
	});
}

};
export {__js_standard_studies_momentum_}
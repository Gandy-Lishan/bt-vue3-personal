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

/** 复写了部分chartiq-DEV-ONLY-source */

import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
import { getPropertyByString } from "@/utils/globalFunc"

let __st_js_chartengine_prototype_overwrite_ = (_exports) => {
/* global _CIQ, _timezoneJS, _SplinePlotter */

var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (CIQ.ChartEngine) {
	CIQ.ChartEngine.prototype.calculateSymbolRatio = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		var field = "Close"
		var subField = field
		const comparisonSymbol = CIQ.store.$state.comparisonSymbol || { url: null, name: null }
		var symbol2Field = comparisonSymbol.url
		if(!comparisonSymbol.url){
			symbol2Field = field
			console.log('SymbolRatio is only allowed in dual symbol')
		}
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			var RatioValue = getPropertyByString(d, field, subField) / getPropertyByString(d, symbol2Field, subField);
			d.Ratio = RatioValue;
			var symbolObj = d[symbol2Field]
			if (symbolObj && typeof symbolObj == "object") {
				
				symbolObj.Ratio = RatioValue;
			}
		}
	};

	/**
	 * Calculates Shifted Sentiment Indicator values for the dataSet
	 * Similar to calculateSymbolRatio, pre-computes shifted values for MA calculation
	 * @param  {CIQ.ChartEngine.Chart} chart The chart to calculate
	 * @param  {string} sourceField The original indicator field (e.g., 'model_aim')
	 * @param  {number} shift The number of periods to shift
	 * @param  {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateShiftedSentiment = function (chart, sourceField, outputField, shift, data) {
		if (!data) data = chart.dataSet;
		if (!sourceField || shift === undefined || shift === null) return;

		//const outputField = 'ShiftedSentimentIndicator';

		for (var i = 0; i < data.length; i++) {
			const sourceIndex = i - shift;
			if (sourceIndex >= 0 && data[sourceIndex][sourceField]) {
				data[i][outputField] = data[sourceIndex][sourceField];
			}
		}
	};

	/*********************chartiq-DEV-ONLY-source.js**********************/

	/**
	 * Calculates the ATR (Average True Range) for the dataSet
	 * dual symbol version****************
	 * @private
	 * @param  {CIQ.ChartEngine.Chart} chart The chart to calculate
	 * @param  {number} period The number of periods
	 * @param  {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateATR = function (chart, period, data) {
		if (!data) data = chart.dataSet;
		var state = chart.state.calculations.atr;
		if (!state) state = chart.state.calculations.atr = {};
		if (!period) period = 20;
		var accum = [];
		if (state.accum) accum = state.accum;
		var q1;
		var filteredData1 = chart.scrubbed
		for (var i = 0; i < filteredData1.length; i++) {
			var q = filteredData1[i];
			q1 = i ? filteredData1[i - 1] : state.q1;
			if (!q1) continue;
			var trueRange = Math.max(
				q.High - q.Low,
				Math.abs(q.High - q1.Close),
				Math.abs(q.Low - q1.Close)
			);
			if (accum.length < period) {
				if (accum.push(trueRange) == period) {
					var total = 0;
					for (var j = 0; j < accum.length; j++) total += accum[j];
					q.atr = total / period;
				}
			} else {
				q.atr = (q1.atr * (period - 1) + trueRange) / period;
			}
			q.trueRange = trueRange;
		}

		/** dual symbol */
		var _accum = [];
		if (state._accum) _accum = state._accum;
		var _q1;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		if(comparisonSymbolUrl){
			data = chart.masterData
			var filteredData2 = data.filter(item => item.hasOwnProperty(comparisonSymbolUrl))
			for (var i = 0; i < filteredData2.length; i++) {
				var q = filteredData2[i][comparisonSymbolUrl];
				if (!q) continue;
				_q1 = i ? filteredData2[i - 1][comparisonSymbolUrl] : state._q1;
				if (!_q1) continue;
				var trueRange = Math.max(
					q.High - q.Low,
					Math.abs(q.High - _q1.Close),
					Math.abs(q.Low - _q1.Close)
				);
				if (_accum.length < period) {
					if (_accum.push(trueRange) == period) {
						var total = 0;
						for (var j = 0; j < _accum.length; j++) total += _accum[j];
						q.atr = total / period;
					}
				} else {
					q.atr = (_q1.atr * (period - 1) + trueRange) / period;
				}
				q.trueRange = trueRange;
			}
		}
		chart.state.calculations.atr = {
			accum: accum,
			_accum: _accum,

			/** dual symbol */
			q1: q1,
			_q1: _q1,
		};
	};
	/**
	 * Calculates the Median Price for the dataSet.
	 * dual symbol version****************
	 * @private
	 * @param {CIQ.ChartEngine.Chart} chart The chart to update.
	 * @param {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateMedianPrice = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		// 默认是data(scrumbed)或者chart.dataSet,但是双股票情况下在处理第二个股票hl/2
		// 时dataSet还为空，所以设为chart.masterData
		if(comparisonSymbolUrl) data = chart.masterData
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			d["hl/2"] = (d.High + d.Low) / 2;
			var symbolObj = d[comparisonSymbolUrl]
			if (symbolObj && typeof symbolObj == "object") {
				
				symbolObj["hl/2"] = (symbolObj.High + symbolObj.Low) / 2;
			}
		}
	};

	/**
	 * Calculates the Typical Price for the dataSet.
	 * dual symbol version****************
	 * @private
	 * @param {CIQ.ChartEngine.Chart} chart The chart to update.
	 * @param {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateTypicalPrice = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		// 默认是data(scrumbed)或者chart.dataSet,但是双股票情况下在处理第二个股票hl/2
		// 时dataSet还为空，所以设为chart.masterData
		if(comparisonSymbolUrl) data = chart.masterData
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			d["hlc/3"] = (d.High + d.Low + d.Close) / 3;
			var symbolObj = d[comparisonSymbolUrl]
			if (symbolObj && typeof symbolObj == "object") {
				
				symbolObj["hlc/3"] = (symbolObj.High + symbolObj.Low + symbolObj.Close) / 3;
			}
		}	
	};

	/**
	 * Calculates the Weighted Close for the dataSet.
	 * dual symbol version****************
	 * @private
	 * @param {CIQ.ChartEngine.Chart} chart The chart to update.
	 * @param {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateWeightedClose = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		// 默认是data(scrumbed)或者chart.dataSet,但是双股票情况下在处理第二个股票hl/2
		// 时dataSet还为空，所以设为chart.masterData
		if(comparisonSymbolUrl) data = chart.masterData
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			d["hlcc/4"] = (d.High + d.Low + 2 * d.Close) / 4;
			var symbolObj = d[comparisonSymbolUrl]
			if (symbolObj && typeof symbolObj == "object") {
				
				symbolObj["hlcc/4"] = (symbolObj.High + symbolObj.Low + 2 * symbolObj.Close) / 4;
			}
		}	
	};

	/**
	 * Calculates the (Open + High + Low + Close) / 4 for the dataSet.
	 * dual symbol version****************
	 * @private
	 * @param {CIQ.ChartEngine.Chart} chart The chart to update.
	 * @param {array} data The data to process, if omitted, uses chart.dataSet
	 * @memberof CIQ.ChartEngine
	 */
	CIQ.ChartEngine.prototype.calculateOHLC4 = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		// 默认是data(scrumbed)或者chart.dataSet,但是双股票情况下在处理第二个股票hl/2
		// 时dataSet还为空，所以设为chart.masterData
		if(comparisonSymbolUrl) data = chart.masterData
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			d["ohlc/4"] = (d.Open + d.High + d.Low + d.Close) / 4;
			var symbolObj = d[comparisonSymbolUrl]
			if (symbolObj && typeof symbolObj == "object") {
				
				symbolObj["ohlc/4"] = (symbolObj.Open + symbolObj.High + symbolObj.Low + symbolObj.Close) / 4;
			}
		}
	};
	CIQ.ChartEngine.prototype.calculateDailyChange = function (chart, data) {
		if (!data) data = chart.dataSet;
		var d;
		const comparisonSymbolUrl = CIQ.store.$state.comparisonSymbol || { url: null, name: null }?.url
		// 默认是data(scrumbed)或者chart.dataSet,但是双股票情况下在处理第二个股票hl/2
		// 时dataSet还为空，所以设为chart.masterData
		if(comparisonSymbolUrl) data = chart.masterData
		for (var i = 0; i < data.length; ++i) {
			d = data[i];
			d["change"] = d.Close / d.iqPrevClose - 1;
			var symbolObj = d[comparisonSymbolUrl]
			if (symbolObj && typeof symbolObj == "object") {
				symbolObj["change"] = symbolObj.Close / symbolObj.iqPrevClose - 1;
			}
		}	
	};

	CIQ.ChartEngine.prototype.setPanelHeight = function (
		panelToModify,
		requestedHeight
	) {
		if (!requestedHeight) return;
	
		const clientHeight = document.querySelector(".chartContainer").clientHeight
		const indicatorHeight  = clientHeight / (5 + Object.keys(this.panels).length-1);
		const mainChartHeight  = indicatorHeight * 4;
		const newRemainingPercentForEach = indicatorHeight / clientHeight;
    	const newPercent = mainChartHeight / clientHeight;

		if(Object.keys(this.panels).length-1 == 1) {
			Object.values(this.panels).forEach((panel) => {
				panel.percent = 0.5;
			});
			panelToModify.percent = 0.5;
		}else{
			Object.values(this.panels).forEach((panel) => {
				panel.percent = newRemainingPercentForEach;
			});
			panelToModify.percent = newPercent;
		}
		this.adjustPanelPositions();
		this.savePanels();
	};

	/**
	 * 不可避免要改变容器的高度考虑到高度随新的指标加入会增加
	 * 而不是setPanelHeight中之前设定的固定高度前提下分配剩余空间
	 */
	CIQ.ChartEngine.prototype.prepend("resizeChart", function () {
		let chartWrapper = document.querySelector(".chart-wrapper");
		let chartContainer = document.querySelector(".chartContainer");
		if(!chartWrapper) return

		const studiesLen = Object.keys(this.panels).filter(i=>i!='chart').length
		const studiesHeight = 			
			studiesLen <= 0
			? 0
			:studiesLen <= 1
			? 100
			: studiesLen <= 2
				? 100
				// : 80
				: 100
		const studiesPanelsSize = studiesLen * studiesHeight
		// 旧版实测绘图区域：
		//   0 study：1130×790 → 比例 1.43
		//   2 study：1130×990 → 比例 1.14
		// 旧版公式：总高度 = 680 + 110 + studiesPanelsSize（rangeSliderOffSet 实际为 0）
		// 新版需要按宽度比例缩放总高度，保持视觉比例一致
		const baseTotalHeight = 680 + 110 + studiesPanelsSize  // 旧版基准总高度
		const oldWidth = 1130
		const currentWidth = chartContainer.clientWidth || 1130
		// 按宽度比例缩放总高度
		const scaledTotalHeight = Math.round(baseTotalHeight * (currentWidth / oldWidth))
		// /reports 页面使用窗口高度
		let chartPanelSize = window.location.pathname=='/reports' ? window.innerHeight - 260 - studiesPanelsSize - 110 : (scaledTotalHeight - 110 - studiesPanelsSize)
		// TODO 考虑优化

		// 由于chart wrapper高度由代码控制，rangeSlider的高度也应该在显示时被考虑进去
		let rangeSliderOffSet = 0
		if(CIQ.stxx?.layout?.rangeSlider) {
			rangeSliderOffSet = 60
		}
		if(CIQ.stxx && CIQ.stxx.fullScreen.fullScreenState){
			requestAnimationFrame(() => {
				chartWrapper.style.height = '100%'
				chartContainer.style.height = (chartWrapper.clientHeight - 110 - rangeSliderOffSet) + "px";
				chartWrapper.style.resize = 'none'
			})
		}else{
			// 正常添加指標時總高度按照 chartPanelSize + toolbar + studies 来算（和旧版一致，不加 rangeSliderOffSet）
			if(!CIQ.isResizing){
				requestAnimationFrame(() => {
					chartWrapper.style.height = (chartPanelSize + 110 + studiesPanelsSize) + "px";
					chartContainer.style.height = (chartWrapper.clientHeight - 110) + "px";
				})
			}else{
				if(!chartWrapper.clientHeight) {
					requestAnimationFrame(() => {
						chartWrapper.style.height = (chartPanelSize + 110 + studiesPanelsSize) + "px";
					})
				}
				requestAnimationFrame(() => {
					chartContainer.style.height = (chartWrapper.clientHeight - 110) + "px";
				})
			}
		}

		this.setPanelHeight(this.panels.chart, chartPanelSize);
	})
	CIQ.ChartEngine.prototype.dualSymbolCalculationErrorWatermark = function (
		stx,
		sd,
		quotes
	) {
		var field	// 它是流动的
		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol || { url: null, name: null }.url
		}
		const hasVolume = getPropertyByString(quotes[quotes.length-1],field,'Volume')
		if(!hasVolume && hasVolume!= 0) stx.displayErrorAsWatermark(sd.panel, "Not enough data to compute");
	};
}

};
// __st_js_standard_studies_(typeof window !== "undefined" ? window : global);
export {__st_js_chartengine_prototype_overwrite_}


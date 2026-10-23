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
import "chartiq/js/standard/studies.js";
import { getPropertyByString,getCoresSymbolDual } from "@/utils/globalFunc"
import { formatStandardTime } from '@/utils'

let __js_st_studies_customized_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */

var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"movingAverages feature requires first activating studies feature."
	);
} else {
	CIQ.Studies.calculateMovingAverageRatio = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var acc = 0;
		var vals = [];
		var acc2 = 0;
		var vals2 = [];
	
		var inputs = sd.inputs
		var name = sd.name;
		if (!sd.ma1Period) sd.ma1Period = parseFloat(inputs["Period1"]);
		if (!sd.ma2Period) sd.ma2Period = parseFloat(inputs["Period2"]);
		// for (var p in sd.outputs) {
		// 	name = p + " " + name;
		// }
		var name1 = "MA " + name
		var name2 = "MA2 " + name
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close"; // Handle when the default inputs are passed in
		var offset = parseInt(sd.inputs.Offset, 10);
		if (isNaN(offset)) offset = 0;
		var i,
			val,
			ft,
			start = sd.startFrom;
		// backload the past data into the array
		var offsetBack = offset;
		for (i = sd.startFrom - 1; i >= 0; i--) {
			val = quotes[i][field];
			if (val && typeof val == "object") val = val[sd.subField];
			if (!val && val !== 0) continue;
			if (offsetBack > 0) {
				offsetBack--;
				start = i;
				continue; 
			}
			if (vals.length != sd.ma1Period - 1){
				acc += val;
				vals.unshift(val);
			}
			if (vals2.length != sd.ma2Period - 1){
				acc2 += val;
				vals2.unshift(val);
			}
		}
		if (vals.length < sd.ma1Period - 1) {
			vals = [];
			start = 0; // not enough records to continue where left off
		}
		if (vals2.length < sd.ma2Period - 1) {
			vals2 = [];
			start = 0; // not enough records to continue where left off
		}
		var futureTicks = [];
		for (i = start; i < quotes.length; i++) {
			var quote = quotes[i];
			val = quote[field];
			if (val && typeof val == "object") val = val[sd.subField];
			var notOverflowing = i + offset >= 0 && i + offset < quotes.length;
			var offsetQuote = notOverflowing ? quotes[i + offset] : null;
			if (!val && val !== 0) {
				if (offsetQuote) {
					offsetQuote[name1] = null;
					offsetQuote[name2] = null;
				}
				else if (i + offset >= quotes.length) {
					ft = {};
					ft[name1] = null;
					ft[name2] = null;
					futureTicks.push(ft);
				}
				continue;
			}
			acc += val;
			acc2 += val;
			vals.push(val);
			vals2.push(val);
			if (vals.length > sd.ma1Period) acc -= vals.shift();
			if (vals2.length > sd.ma2Period) acc2 -= vals2.shift();
			var myVal = vals.length == sd.ma1Period ? acc / sd.ma1Period : null;
			var myVal2 = vals2.length == sd.ma2Period ? acc2 / sd.ma2Period : null;
			if (offsetQuote) {
				offsetQuote[name1] = myVal;
				offsetQuote[name2] = myVal2;
			}
			else if (i + offset >= quotes.length) {
				ft = {};
				ft[name1] = myVal;
				ft[name2] = myVal2;
				futureTicks.push(ft);
			}
		}
		sd.appendFutureTicks(stx, futureTicks);
	};
	
	CIQ.Studies.calculateMovingAverageGap = function (stx, sd) {
		if (!sd.chart.scrubbed) return;
	
		var quotes = sd.chart.scrubbed;
		var acc = 0;
		var vals = [];
		var name = sd.name;
		for (var p in sd.outputs) {
			name = p + " " + name;
		}
	
		 var field = sd.inputs.Field;
		 if (!field || field == "field") field = "Close"; // Handle when the default inputs are passed in
			var offset = parseInt(sd.inputs.Offset, 10);
			if (isNaN(offset)) offset = 0;
	
		var i,
			val,
			ft,
			start = sd.startFrom;
		// backload the past data into the array
		var offsetBack = offset;
		for (i = sd.startFrom - 1; i >= 0; i--) {
			val = quotes[i][field];
			if (val && typeof val == "object") val = val[sd.subField];
			if (!val && val !== 0) continue;
			if (offsetBack > 0) {
				offsetBack--;
				start = i;
				continue;
			}
			if (vals.length == sd.days - 1) break;
			acc += val;
			vals.unshift(val);
		}
		if (vals.length < sd.days - 1) {
			vals = [];
			start = 0; // not enough records to continue where left off
		}
		var futureTicks = [];
		for (i = start; i < quotes.length; i++) {
			var quote = quotes[i];
			val = quote[field];
			if (val && typeof val == "object") val = val[sd.subField];
			var notOverflowing = i + offset >= 0 && i + offset < quotes.length;
			var offsetQuote = notOverflowing ? quotes[i + offset] : null;
			if (!val && val !== 0) {
				if (offsetQuote) offsetQuote[name] = null;
				else if (i + offset >= quotes.length) {
					ft = {};
					ft[name] = null;
					futureTicks.push(ft);
				}
				continue;
			}
			acc += val;
			vals.push(val);
			if (vals.length > sd.days) acc -= vals.shift();
			var myVal = vals.length == sd.days ? acc / sd.days : null;
			if (offsetQuote){
				offsetQuote[name] = myVal;
				//offsetQuote['']
			}
			else if (i + offset >= quotes.length) {
				ft = {};
				ft[name] = myVal;
				futureTicks.push(ft);
			}
	
			if (i > start) {
				var prevQuote = quotes[i - 1];
				quote["Gap"] = quote[name] - prevQuote[name];
			}
		}
		for (i = start; i < quotes.length; i++) {
			var quote = quotes[i];
			quote[name] = quote["Gap"]
		}
		sd.appendFutureTicks(stx, futureTicks);
		
	};

	// Symbol Ohlcv convenience function.
	// 计算中间量（OHLCV value）函数
	// CIQ.Studies.TickerOHLCV = async function (sd) {
	// 	var field = sd.inputs.Field
	// 	var quotes = sd.chart.scrubbed;
	// 	/** 
	// 	 * symbol ohlcv改用maLayout管理状态，不是传统tech， 弃用isComparison
	// 	 *  */
	// 	if(sd?.parameters?.criteria && sd?.parameters?.criteria?.endsWith('2')){
	// 		quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
	// 	}else{
	// 		quotes = sd.chart.scrubbed
	// 	}
	// 	const ohlcvDataMap = new Map();

	// 	if(sd.type == "ST ROCLike") {
	// 		/** 计算前先计算并储存好tickerOHLCV在sd.chart内 */
	// 		var activatedMALayoutList = CIQ.store.$state.activatedMALayout?CIQ.store.$state.activatedMALayout:[]
	// 		if(activatedMALayoutList.length == 0) return
	// 		// 和sentiment indciator roc不同，symnol的需要定位到具体位置因为可以显示多个
	// 		// 而这也会导致计算函数介入了MAlayout, manageChartLayout功能在还原layout前需要还原MAlayout
	// 		const symbolOhlcvLayout = activatedMALayoutList.find(
	// 			(item) => item.criteria == sd.parameters.criteria && item.index == sd.parameters.index
	// 		)
	// 		if(symbolOhlcvLayout) sd.ticker = symbolOhlcvLayout.ticker
	// 	}
	// 	if(sd.type == 'Symbol Volume') {
	// 		sd.ticker = sd.parameters.ticker
	// 	}
		
	// 	const tickerPairdata = CIQ.store.$state.tickerOhlcvPairdata[sd.ticker] || []
	// 	// 一般来说会在计算函数之前获取数据，这里是做了一层保险
	// 	// (比如API报错或者restoreChartLayout,后者不会调用getMetaData也就不会初始化ohlcv数据)
	// 	if(tickerPairdata.length == 0) {
	// 		tickerPairdata = await CIQ.store.get_ticker_ohlcv_pairdata(sd.ticker)
	// 	}
	// 	for (const item of tickerPairdata) {
	// 		if (item.DT && item[field] !== undefined) {
	// 			ohlcvDataMap.set(item.DT.getTime(), item);
	// 		}
	// 	}
	// 	// 2. 遍历数据源，匹配并添加/更新属性
	// 	// O(N) 复杂度, N 是 quotes 的长度
	// 	for (var i = sd.startFrom; i < quotes.length; i++) {
	// 		let quote = quotes[i];
	// 		if (!quote) continue;
	// 		var lastBar = quote
	// 		if(i >= 1) lastBar = quotes[i-1]

	// 		const timestamp = quote.DT.getTime();
	// 		const preTimestamp = lastBar.DT.getTime();
			
	// 		// 检查当前项的 DT 是否在 Map 中存在
	// 		if (ohlcvDataMap.has(timestamp) && ohlcvDataMap.has(preTimestamp)) {
	// 			if(sd.type == 'Symbol Volume') {
	// 				// 如果存在，获取对应的 Close 值
	// 				const ohlcvVal = ohlcvDataMap.get(timestamp);
	// 				const preOhlcvVal = ohlcvDataMap.get(preTimestamp);
	// 				// 还需另外存前后两天的收盘价用来计算Volume着色（不是比较O和C）
	// 				quote["Close " + sd.name] = ohlcvVal['Close'];
	// 				quote["PreClose " + sd.name] = preOhlcvVal['Close'];
	// 			}
	// 			const ohlcvValue = ohlcvDataMap.get(timestamp);
	// 			quote["Result _OHLCV " + sd.name] = ohlcvValue[field];
	// 		}
	// 	}
	// };
	CIQ.Studies.TickerOHLCV = async function (
		name,
		stx,
		sd,
		field,
		ticker,
		shiftOffset
	) {
		var ohlcv = new CIQ.Studies.StudyDescriptor(
			name + " " + sd.name,
			field,
			sd.panel
		);
		
		ohlcv.chart = sd.chart;
		ohlcv.startFrom = sd.startFrom;
		ohlcv.inputs = {};
		if (field) ohlcv.inputs.Field = CIQ.findSymbolIndicator(field, null).field;
		// dual symbol new features
		ohlcv.parameters = {
			criteria: sd.parameters.criteria,
			index: sd.parameters.index,
			ticker: ticker,
			shiftOffset: shiftOffset,
		}
		await CIQ.Studies.calculateSymbolOhlcv(stx, ohlcv);
	};

	CIQ.Studies.calculateSymbolROCLike = async function (stx, sd) {
		var condition = sd.inputs.condition;
		var period = sd.inputs.period;

		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 计算前先计算并储存好symbolRatio在sd.chart内 */
		if (field == 'Ratio') CIQ.stxx.calculateSymbolRatio(sd.chart);
		
		field = "Result _OHLCV " + sd.name

		var quotes = sd.chart.scrubbed;

		/** 判断Study用来计算的数据源 */
		if(sd.parameters.criteria && sd.parameters.criteria.endsWith('2')){
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			sd.yAxis = null
			quotes = sd.chart.scrubbed
		} 

		/** myIndicator 区分shift前后的指标 */
		if(window.location.pathname.includes('/myindicator')) {
			const symbolLabel = getCoresSymbolDual(sd.parameters.criteria.endsWith(2))
        	let display = `(${symbolLabel}) Symbol Close Rate Of Change(${period}-Bar)`
			const miShift = CIQ.store.$state.miFormShift
			// 左侧ma
			if(!sd.parameters.criteria.endsWith('2')) {
				sd.inputs.display = display
			}
			else if(miShift.showInput && miShift.display) sd.inputs.display = `${display}(shift-${miShift.value || 0})`
			// myindicator情况下显示带空格的display以区分左侧的ma
			else if(!(miShift.showInput && miShift.display)) sd.inputs.display = `${display} `
		}

		// 下面为计算 ROC, ROR, MAR 的具体公式。
		// 使用中公式
		let resArr = []
		switch(condition){
			case 'ROC':
				// ROC
				// 从当前indicator数据出现那天开始计算
				let indexROC = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexROC) 

				resArr = quotes.map((row, i) => {
					// before:	if(field in quotes[i] &&  quotes[i][field]!=null){}
					if(field in row && row[field]!=null){
						if(i>=period){
							// 如果分母为0，直接返回0
							if(quotes[i - period][field] == 0) return 0
							
							const change = parseFloat((100 * (
								row[field] / 
								quotes[i - period][field]- 1
							)).toFixed(4))
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'OPR':
				// OPR
				// 从当前indicator数据出现那天开始计算
				let indexOPR = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexOPR) 
				const minCloseArrOPR = getPeriodParam(quotes.map(row => row[field]), "min", period, 0);
				const maxCloseArrOPR = getPeriodParam(quotes.map(row => row[field]), "max", period, 0);
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period){
							// 如果分母为0，直接返回0
							if(maxCloseArrOPR[i] - minCloseArrOPR[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(row[field] - minCloseArrOPR[i]) / 
								(maxCloseArrOPR[i] - minCloseArrOPR[i])
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'RR':
				// Range Rank
				// 计算含当天值的排名，即数值保证在 0 - 100 之间
				let indexRR = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexRR) 
				const minCloseArrRR = getPeriodParam(quotes.map(row => row[field]), "min", period, 1);
				const maxCloseArrRR = getPeriodParam(quotes.map(row => row[field]), "max", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(maxCloseArrRR[i] - minCloseArrRR[i] == 0) return 0
							
							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(row[field] - minCloseArrRR[i]) / 
								(maxCloseArrRR[i] - minCloseArrRR[i])
							).toFixed(4))
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'MA':
				// MA
				// 从当前indicator数据出现那天开始计算
				let indexMA = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexMA) 
				const maArr = quotes.map((row, i, arr) => {
					if(field in row && row[field]!=null){
						if(i>=period - 1){
							return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b[field], 0) / period
						}
						return NaN
					}else{
						return NaN
					}
				});
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period - 1){
							return parseFloat((row[field] / maArr[i]).toFixed(4))
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the MA Ratio value, please change a value')
				} 
				break;
			case 'DD':
				// 公式：(Current close - Highest Close) / Highest Close
				let indexDD = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexDD) 
				const maxCloseArrDD = getPeriodParam(quotes.map(row => row[field]), "max", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(maxCloseArrDD[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(row[field] - maxCloseArrDD[i]) / 
								maxCloseArrDD[i]
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'DU':
				// 公式：(Current close - Highest Close) / Highest Close
				let indexDU = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexDU) 
				const minCloseArrDU = getPeriodParam(quotes.map(row => row[field]), "min", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(minCloseArrDU[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(row[field] - minCloseArrDU[i]) / 
								minCloseArrDU[i]
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'NC':
				// ROC
				// 从当前indicator数据出现那天开始计算
				let indexNC = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexNC) 
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						if(i>=period){
							
							const change = parseFloat((
								row[field] - 
								quotes[i - period][field]
							).toFixed(4))
							return change
						}
						return NaN
					}else{
						return NaN
					}
				});
				break;
			case 'ATH':
				// 从当前indicator数据出现那天开始计算
				let indexATH = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexATH) 
				let indicatorATH = 0
				let maxSoFar = -Infinity;

				resArr = quotes.map((row, i) => {
					if (field in row && row[field] != null) {
						if (row[field] >= maxSoFar) {
							maxSoFar = row[field];
							indicatorATH = 1;
						} else {
							indicatorATH = 0;
						}
						return indicatorATH;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'ATL':
				// 从当前indicator数据出现那天开始计算
				let indexATL = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexATL) 
				let indicatorATL = 0
				let minSoFar = Infinity;

				resArr = quotes.map((row, i) => {
					if (field in row && row[field] != null) {
						if (row[field] <= minSoFar) {
							minSoFar = row[field];
							indicatorATL = 1;
						} else {
							indicatorATL = 0;
						}
						return indicatorATL;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'CNDA':
				// 从当前indicator数据出现那天开始计算
				let indexCNDA = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexCNDA)
				let indicatorCNDA = 0
				resArr = quotes.map((row, i) => {
					if (field in row && row[field] != null) {
						if (row[field] > period) {
							indicatorCNDA++
						} else {
							indicatorCNDA = 0;
						}
						return indicatorCNDA;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				} 
				break;
			case 'CNDB':
				// 从当前indicator数据出现那天开始计算
				let indexCNDB = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexCNDB)
				let indicatorCNDB = 0
				resArr = quotes.map((row, i) => {
					if (field in row && row[field] != null) {
						if (row[field] < period) {
							indicatorCNDB++
						} else {
							indicatorCNDB = 0;
						}
						return indicatorCNDB;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				} 
			break;
			case 'NH':
				// NH
				// 从当前indicator数据出现那天开始计算
				let indexNH = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexNH) 
				const maxCloseArrNH = getPeriodParam(quotes.map(row => row[field]), "max", period, 1);
				resArr = maxCloseArrNH
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
			break;
			case 'NL':
				// NL
				// 从当前indicator数据出现那天开始计算
				let indexNL = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexNL) 
				const maxCloseArrNL = getPeriodParam(quotes.map(row => row[field]), "min", period, 1);
				resArr = maxCloseArrNL
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
			break;
			case 'NA':
				// NA
				// 基于当前指标数据生成N个bar前的数据，显示为一个平移的线
				let indexNA = quotes.findIndex(row=> 
					field in row && row[field]!=null
				)
				quotes = quotes.slice(indexNA)
				
				// period 作为 shift 的 bar 数量
				const shiftPeriod = parseInt(period) || 0
				resArr = quotes.map((row, i) => {
					if(field in row && row[field]!=null){
						// 获取当前值向前 shiftPeriod 个 bar 的值
						const shiftedIndex = i - shiftPeriod
						if(shiftedIndex >= 0 && shiftedIndex < quotes.length){
							return quotes[shiftedIndex][field]
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the VOL value, please change a value')
				}
			break;
			default:
			console.error('no such condition')
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			quote[sd.inputs.display] = resArr[i];
		}

		sd.outputMap = {}
		sd.outputMap[sd.inputs.display] = "Result";

		// 强制刷新一次
		stx.draw();
	};
	CIQ.Studies.calculateSentiROCLike = function (stx, sd) {
		var condition = sd.inputs.condition;
		var period = sd.inputs.period;

		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 计算前先计算并储存好symbolRatio在sd.chart内 */
		if (field == 'Ratio') CIQ.stxx.calculateSymbolRatio(sd.chart);
		var quotes = sd.chart.scrubbed;

		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field
		/** 判断Study用来计算的数据源 */
		if(sd.parameters.criteria && sd.parameters.criteria.endsWith('2')){
			// var comparisonSymbol = CIQ.store.$state.comparisonSymbol
			// // 只处理计算数据源和symbol2相关的逻辑（symbol2 symbolClose）
			// if(CIQ.findSymbolIndicator(null, field)){
			// 	field = comparisonSymbol?.url
			// 	quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
			// }
		}else{
			sd.yAxis = null
			quotes = sd.chart.scrubbed
		} 
		/** myIndicator 区分shift前后的指标 */
		if(window.location.pathname.includes('/myindicator')) {
			const symbolLabel = getCoresSymbolDual(sd.parameters.criteria.endsWith(2))
        	let display = `(${symbolLabel}) Symbol Close Rate Of Change(${period}-Bar)`
			const miShift = CIQ.store.$state.miFormShift
			// 左侧ma
			if(!sd.parameters.criteria.endsWith('2')) {
				sd.inputs.display = display
			}
			else if(miShift.showInput && miShift.display) sd.inputs.display = `${display}(shift-${miShift.value || 0})`
			// myindicator情况下显示带空格的display以区分左侧的ma
			else if(!(miShift.showInput && miShift.display)) sd.inputs.display = `${display} `
		}

		// 下面为计算 ROC, ROR, MAR 的具体公式。
		// 使用中公式
		let resArr = []
		switch(condition){
			case 'ROC':
				// ROC
				// 从当前indicator数据出现那天开始计算
				let indexROC = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexROC) 

				resArr = quotes.map((row, i) => {
					// before:	if(field in quotes[i] &&  quotes[i][field]!=null){}
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period){
							// 如果分母为0，直接返回0
							if(getPropertyByString(quotes[i - period],field,subField) == 0) return 0
							
							const change = parseFloat((100 * (
								getPropertyByString(row,field,subField) / 
								getPropertyByString(quotes[i - period],field,subField)- 1
							)).toFixed(4))
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'OPR':
				// OPR
				// 从当前indicator数据出现那天开始计算
				let indexOPR = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexOPR) 
				const minCloseArrOPR = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "min", period, 0);
				const maxCloseArrOPR = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "max", period, 0);
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period){
							// 如果分母为0，直接返回0
							if(maxCloseArrOPR[i] - minCloseArrOPR[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(getPropertyByString(row,field,subField) - minCloseArrOPR[i]) / 
								(maxCloseArrOPR[i] - minCloseArrOPR[i])
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'RR':
				// Range Rank
				// 计算含当天值的排名，即数值保证在 0 - 100 之间
				let indexRR = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexRR) 
				const minCloseArrRR = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "min", period, 1);
				const maxCloseArrRR = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "max", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(maxCloseArrRR[i] - minCloseArrRR[i] == 0) return 0
							
							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(getPropertyByString(row,field,subField) - minCloseArrRR[i]) / 
								(maxCloseArrRR[i] - minCloseArrRR[i])
							).toFixed(4))
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'MA':
				// MA
				// 从当前indicator数据出现那天开始计算
				let indexMA = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexMA) 
				const maArr = quotes.map((row, i, arr) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period - 1){
							return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + getPropertyByString(b,field,subField), 0) / period
						}
						return NaN
					}else{
						return NaN
					}
				});
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period - 1){
							return parseFloat((getPropertyByString(row,field,subField) / maArr[i]).toFixed(4))
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the MA Ratio value, please change a value')
				} 
				break;
			case 'DD':
				// 公式：(Current close - Highest Close) / Highest Close
				let indexDD = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexDD) 
				const maxCloseArrDD = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "max", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(maxCloseArrDD[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(getPropertyByString(row,field,subField) - maxCloseArrDD[i]) / 
								maxCloseArrDD[i]
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'DU':
				// 公式：(Current close - Highest Close) / Highest Close
				let indexDU = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexDU) 
				const minCloseArrDU = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "min", period, 1);
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period - 1){
							// 如果分母为0，直接返回0
							if(minCloseArrDU[i] == 0) return 0

							/** 因为minClose,maxClose也保留了三位小数 */
							const change = parseFloat((100 * 
								(getPropertyByString(row,field,subField) - minCloseArrDU[i]) / 
								minCloseArrDU[i]
							).toFixed(4))
							
							return (change==Infinity || change==-Infinity) ? 0 : change
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
				break;
			case 'NC':
				// ROC
				// 从当前indicator数据出现那天开始计算
				let indexNC = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexNC) 
				resArr = quotes.map((row, i) => {
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=period){
							
							const change = parseFloat((
								getPropertyByString(row,field,subField) - 
								getPropertyByString(quotes[i - period],field,subField)
							).toFixed(4))
							//console.log(row[field] , quotes[i - period][field],row,i)
							return change
						}
						return NaN
					}else{
						return NaN
					}
				});
				break;
			case 'ATH':
				// 从当前indicator数据出现那天开始计算
				let indexATH = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexATH) 
				let indicatorATH = 0
				let maxSoFar = -Infinity;

				resArr = quotes.map((row, i) => {
					if (field in row && getPropertyByString(row,field,subField) != null) {
						if (getPropertyByString(row,field,subField) >= maxSoFar) {
							maxSoFar = getPropertyByString(row,field,subField);
							indicatorATH = 1;
						} else {
							indicatorATH = 0;
						}
						return indicatorATH;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'ATL':
				// 从当前indicator数据出现那天开始计算
				let indexATL = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexATL) 
				let indicatorATL = 0
				let minSoFar = Infinity;

				resArr = quotes.map((row, i) => {
					if (field in row && getPropertyByString(row,field,subField) != null) {
						if (getPropertyByString(row,field,subField) <= minSoFar) {
							minSoFar = getPropertyByString(row,field,subField);
							indicatorATL = 1;
						} else {
							indicatorATL = 0;
						}
						return indicatorATL;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				break;
			case 'CNDA':
				// 从当前indicator数据出现那天开始计算
				let indexCNDA = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexCNDA)
				let indicatorCNDA = 0
				resArr = quotes.map((row, i) => {
					if (field in row && getPropertyByString(row,field,subField) != null) {
						if (getPropertyByString(row,field,subField) > period) {
							indicatorCNDA++
						} else {
							indicatorCNDA = 0;
						}
						return indicatorCNDA;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				} 
				break;
			case 'CNDB':
				// 从当前indicator数据出现那天开始计算
				let indexCNDB = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexCNDB)
				let indicatorCNDB = 0
				resArr = quotes.map((row, i) => {
					if (field in row && getPropertyByString(row,field,subField) != null) {
						if (getPropertyByString(row,field,subField) < period) {
							indicatorCNDB++
						} else {
							indicatorCNDB = 0;
						}
						return indicatorCNDB;
					} else {
						return NaN;
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				} 
			break;
			case 'NH':
				// NH
				// 从当前indicator数据出现那天开始计算
				let indexNH = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexNH) 
				const maxCloseArrNH = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "max", period, 1);
				resArr = maxCloseArrNH
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
			break;
			case 'NL':
				// NL
				// 从当前indicator数据出现那天开始计算
				let indexNL = quotes.findIndex(row=> 
					field in row &&  getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexNL) 
				const maxCloseArrNL = getPeriodParam(quotes.map(row => getPropertyByString(row,field,subField)), "min", period, 1);
				resArr = maxCloseArrNL
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROR value, please change a value')
				} 
			break;
			case 'NA':
				// NA
				// 基于当前指标数据生成N个bar前的数据，显示为一个平移的线
				let indexNA = quotes.findIndex(row=> 
					field in row && getPropertyByString(row,field,subField)!=null
				)
				quotes = quotes.slice(indexNA)
				
				// period 作为 shift 的 bar 数量
				const shiftPeriod = parseInt(period) || 0
				resArr = quotes.map((row, i) => {
					if(field in row && getPropertyByString(row,field,subField)!=null){
						// 获取当前值向前 shiftPeriod 个 bar 的值
						const shiftedIndex = i - shiftPeriod
						if(shiftedIndex >= 0 && shiftedIndex < quotes.length){
							return getPropertyByString(quotes[shiftedIndex],field,subField)
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(resArr.length>1 && resArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the VOL value, please change a value')
				}
			break;
			default:
			console.error('no such condition')
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			quote[sd.inputs.display] = resArr[i];
		}

		sd.outputMap = {}
		sd.outputMap[sd.inputs.display] = "Result";
	};
	CIQ.Studies.calculateSymbolOhlcv = async function (stx, sd) {
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 计算前先计算并储存好symbolRatio在sd.chart内 */
		if (field == 'Ratio') CIQ.stxx.calculateSymbolRatio(sd.chart);
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */

		var subField = field
		var quotes = sd.chart.scrubbed;
		/** 
		 * symbol ohlcv改用maLayout管理状态，不是传统tech， 弃用isComparison
		 *  */
		if(sd?.parameters?.criteria && sd?.parameters?.criteria?.endsWith('2')){
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}
		
		if(field == 'Ratio') {
			for (var i = sd.startFrom; i < quotes.length; i++) {
				let quote = quotes[i];
				quote["Result " + sd.name] = quote[field];
			}
		}
		else {
			// 创建一个 Map 以便快速通过 DT 查找 Close 值
			// 1. O(M) 复杂度, M 是 _data 的长度
			const ohlcvDataMap = new Map();
			let tickerPairdata = CIQ.store.$state.tickerOhlcvPairdata[sd.parameters.ticker] || []
			// 一般来说会在计算函数之前获取数据，这里是做了一层保险
			// (比如API报错或者restoreChartLayout,后者不会调用getMetaData也就不会初始化ohlcv数据)
			if(tickerPairdata.length == 0) {
				tickerPairdata = await CIQ.store.get_ticker_ohlcv_pairdata(sd.parameters.ticker)
			}
			
			if(sd?.parameters?.shiftOffset) tickerPairdata = formatData(tickerPairdata, sd?.parameters?.shiftOffset)
			for (const item of tickerPairdata) {
				if (item.DT && item[subField] !== undefined) {
					ohlcvDataMap.set(item.DT.getTime(), item);
				}
			}
			// 2. 遍历数据源，匹配并添加/更新属性
			// O(N) 复杂度, N 是 quotes 的长度
			for (var i = sd.startFrom; i < quotes.length; i++) {
				let quote = quotes[i];

				// const timestamp = quote.DT.getTime();
				// // 检查当前项的 DT 是否在 Map 中存在
				// if (ohlcvDataMap.has(timestamp)) {
				// 	// 如果存在，获取对应的 Close 值
				// 	const ohlcvValue = ohlcvDataMap.get(timestamp);
				// 	quote["Result " + sd.name] = ohlcvValue[subField];
				// }

				if (!quote) continue;
				var lastBar = quote
				if(i >= 1) lastBar = quotes[i-1]

				const timestamp = quote.DT.getTime();
				const preTimestamp = lastBar.DT.getTime();
				
				// 检查当前项的 DT 是否在 Map 中存在
				if(sd.type == 'Symbol Volume') {
					if (ohlcvDataMap.has(timestamp) && ohlcvDataMap.has(preTimestamp)) {
						// 如果存在，获取对应的 Close 值
						const ohlcvVal = ohlcvDataMap.get(timestamp);
						const preOhlcvVal = ohlcvDataMap.get(preTimestamp);
						// 还需另外存前后两天的收盘价用来计算Volume着色（不是比较O和C）
						quote["Close " + sd.name] = ohlcvVal['Close'];
						quote["PreClose " + sd.name] = preOhlcvVal['Close'];
						
						quote["Result " + sd.name] = ohlcvVal[subField];
					}
				}else {
					if (ohlcvDataMap.has(timestamp)) {
						const ohlcvVal = ohlcvDataMap.get(timestamp);
						quote["Result " + sd.name] = ohlcvVal[subField];
					}
				}
				
			}
		}
		// 强制刷新一次
		stx.draw();
		//sd.outputMap["Result " + sd.name] = "Symbol High";
	};
	CIQ.Studies.calculateSTMACDGap = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var inputs = sd.inputs,
			name = sd.name;
		if (!sd.macd1Days) sd.macd1Days = parseFloat(inputs["Fast MA Period"]);
		if (!sd.macd2Days) sd.macd2Days = parseFloat(inputs["Slow MA Period"]);
		if (!sd.signalDays) sd.signalDays = parseFloat(inputs["Signal Period"]);
		if (!sd.days) sd.days = Math.max(sd.macd1Days, sd.macd2Days, sd.signalDays);
		
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";

		var maType = inputs["Moving Average Type"];
		if (!maType) maType = "exponential";

		CIQ.Studies.MA(maType, sd.macd1Days, field, 0, "_MACD1", stx, sd);
		CIQ.Studies.MA(maType, sd.macd2Days, field, 0, "_MACD2", stx, sd);

		/** 
		 * 用isComparison属性判断Study用来计算的数据源
		 * 不能用criteria判断,要是加了有些判断就没法锁定目的study（比如csv）
		 * ma和roc就是用critria判断Study用来计算的数据源
		*  */
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

		var i,
			quote,
			start = Math.max(sd.startFrom, sd.days - 1);
		for (i = start; i < quotes.length; i++) {
			quote = quotes[i];
			if (
				(quote["_MACD1 " + name] || quote["_MACD1 " + name] === 0) &&
				(quote["_MACD2 " + name] || quote["_MACD2 " + name] === 0)
			)
				quote["MACD " + name] =
					quote["_MACD1 " + name] - quote["_MACD2 " + name];
		}
		var sigMaType = inputs["Signal MA Type"];
		if (!sigMaType) sigMaType = "exponential";
		CIQ.Studies.MA(
			sigMaType,
			sd.signalDays,
			"MACD " + name,
			0,
			"SignalLine",
			stx,
			sd
		);

		var histogram = sd.name;
		for (var p in sd.outputs) {
			histogram = p + " " + histogram;
		}
		for (i = start; i < quotes.length; i++) {
			quote = quotes[i];
			var signal = quote["SignalLine " + name];
			if (!signal && signal !== 0) continue; // don't create histogram before the signal line is valid
			quote[histogram] = quote["MACD " + name] - quote["SignalLine " + name];

			if (i > start) {
				var prevQuote = quotes[i - 1];
				quote["Gap"] = quote[histogram] - prevQuote[histogram];
			}
		}
		for (i = start; i < quotes.length; i++) {
			var quote = quotes[i];
			quote[histogram] = quote["Gap"]
		}
		//sd.outputMap[histogram] = "";
		
	};
	CIQ.Studies.calculateHighLowLine = function (stx, sd) {
		
		var quotes = sd.chart.scrubbed;
		var points = sd.parameters.points

		// 默认study模板
		const pointsMap = new Map();
		for (let x of points) {
		  const standardDate = formatStandardTime(x.Date);
		  pointsMap.set(standardDate.getTime(), x.PointType);  // 使用 getTime() 作为键存储
		}
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			
			const pointType = pointsMap.get(quote.DT.getTime());  // O(1) 查找
			if (pointType) {
				quote["Result " + sd.name] = pointType=='High'?quote.High:quote.Low; // assign to the final field to be used by your display function.
			}
			// let item = points.find(x=>{
			// 	const standardDate = formatStandardTime(x.Date)
			// 	return standardDate.getTime()==quote.DT.getTime()
			// })
			
			// if(item){
			// 	quote["Result " + sd.name] = item.PointType=='High'?quote.High:quote.Low; // assign to the final field to be used by your display function.
			// }
		}
		//sd.outputMap["Result " + sd.name] = "Symbol High";

	};
	CIQ.Studies.calculateOpeningGap = function (stx, sd) {
		// todo: 考虑从这里开始都替换成scrubbed
		var quotes = sd.chart.scrubbed;
		var field	// 它是流动的
		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}

		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			var lastBar = quote
			if(i >= 1) lastBar = quotes[i-1]

			if(getPropertyByString(lastBar,field,"Close") == 0) return 0
			
			quote["Result " + sd.name] = parseFloat((
				100 * (getPropertyByString(quote,field,"Open") - getPropertyByString(lastBar,field,"Close")) 
				/ getPropertyByString(lastBar,field,"Close")
			).toFixed(4));
		}
	};
	CIQ.Studies.calculateDayofWeek = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			quote["Result " + sd.name] = quote['DT'].getDay();
		}
	};
	CIQ.Studies.calculateMonthofYear = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			quote["Result " + sd.name] = quote['DT'].getMonth() + 1;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysHigh = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				if (getPropertyByString(quote,field,subField) == Math.max(...(quotes.slice(sliceStart, sliceEnd).map(
					row => getPropertyByString(row,field,subField)
				)))) {
					indicator = 0
				}else {
					if(indicator){
						indicator++
					}else{
						indicator = 1
					}
				}
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysLow = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				if (getPropertyByString(quote,field,subField) == Math.min(...(quotes.slice(sliceStart, sliceEnd).map(
					row => getPropertyByString(row,field,subField)
				)))) {
					indicator = 0
				}else {
					if(indicator){
						indicator++
					}else{
						indicator = 1
					}
				}
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysUp = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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
		
		let indicator = 0
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i]
			if (i==0 || !quotes[i]) continue;
			// 如果当前天收盘价高于前一天
			if (getPropertyByString(quote,field,subField) > getPropertyByString(quotes[i-1],field,subField)) {
				indicator++
			}else {
				indicator = 0
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysDown = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let indicator = 0
		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i]
			if (i==0 || !quotes[i]) continue;
			// 如果当前天收盘价低于前一天
			if (getPropertyByString(quote,field,subField) < getPropertyByString(quotes[i-1],field,subField)) {
				indicator++
			}else {
				indicator = 0
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysAboveMA = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field

		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			field,
			0,
			"_MA",
			stx,
			sd
		);

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
		
		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			// ma with 252 bar offset
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				if (getPropertyByString(quote,field,subField) <= quote["_MA " + sd.name]) {
					indicator = 0
				}else {
					if(indicator){
						indicator++
					}else{
						indicator = 1
					}
				}
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysBelowMA = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field

		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			field,
			0,
			"_MA",
			stx,
			sd
		);

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
		
		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			// ma with 252 bar offset
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				if (getPropertyByString(quote,field,subField) >= quote["_MA " + sd.name]) {
					indicator = 0
				}else {
					if(indicator){
						indicator++
					}else{
						indicator = 1
					}
				}
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysRisingMovingAverage = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";

		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			field,
			0,
			"_MA",
			stx,
			sd
		);
		
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

		let indicator = 0
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if (i<period || !quotes[i]) continue;
			// 如果当前天均线高于前一天
			if (quotes[i]["_MA " + sd.name] > quotes[i-1]["_MA " + sd.name]) {
				indicator++
			}else {
				indicator = 0
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateConsecutiveDaysDecliningMovingAverage = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";

		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			sd.days,
			field,
			0,
			"_MA",
			stx,
			sd
		);
		
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
		
		let indicator = 0
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if (i<period || !quotes[i]) continue;
			// 如果当前天均线低于前一天
			if (quotes[i]["_MA " + sd.name] < quotes[i-1]["_MA " + sd.name]) {
				indicator++
			}else {
				indicator = 0
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateDeviationFromTrendBetweenTwoMovingAverages = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var period_short = sd.inputs.periodShort;
		var period_long = sd.inputs.periodLong;
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";

		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			period_short,
			field,
			0,
			"_MA",
			stx,
			sd
		);
		CIQ.Studies.MA(
			sd.inputs["Moving Average Type"],
			period_long,
			field,
			0,
			"_MA2",
			stx,
			sd
		);

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

		for (var i = sd.startFrom; i < quotes.length; i++) {
			if (i+1< Math.max(period_short, period_long) || !quotes[i]) continue;
		
			quotes[i]["Result " + sd.name] = quotes[i]["_MA " + sd.name] / quotes[i]["_MA2 " + sd.name];
		}
	};
	CIQ.Studies.calculatePercentageBelowNDayHigh = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let result
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				/** 防止分母为0或者null */
				let highestPrice = Math.max(...(quotes.slice(sliceStart, sliceEnd).map(row => getPropertyByString(row,field,subField))).filter(i=>!(isNaN(i) || i==null)))
				result = highestPrice?(getPropertyByString(quote,field,subField)/highestPrice-1)*100:0
			}
			quotes[i]["Result " + sd.name] = result;
		}
	};
	CIQ.Studies.calculatePercentageAboveNDayLow = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let result
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				var quote = quotes[i]
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				/** 防止分母为0或者null */
				let lowestPrice = Math.min(...(quotes.slice(sliceStart, sliceEnd).map(row => getPropertyByString(row,field,subField))).filter(i=>!(isNaN(i) || i==null)))
				result = lowestPrice?(getPropertyByString(quote,field,subField)/lowestPrice-1)*100:0
			}
			quotes[i]["Result " + sd.name] = result;
		}
	};
	CIQ.Studies.calculateNDayRealizedVolatility = function (stx, sd) {
		var period = sd.inputs.period;

		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";
		var quotes = sd.chart.scrubbed;

		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
		var subField = field
		/** 判断Study用来计算的数据源 */
		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		} 

				let logArr = quotes.map((row, i) => {
					// before:	if(field in quotes[i] &&  quotes[i][field]!=null){}
					if(field in row &&  getPropertyByString(row,field,subField)!=null){
						if(i>=1){
							// 如果分母为0，直接返回0
							if(getPropertyByString(quotes[i - 1],field,subField) == 0) return 0

							return Math.log((
								getPropertyByString(row,field,subField) / 
								getPropertyByString(quotes[i - 1],field,subField)
							))
						}
						return NaN
					}else{
						return NaN
					}
				});
				if(logArr.length>1 && logArr.every(element => !element)){
					//CIQ.alert('There is no enough data for calculating the ROC value, please change a value')
				}
				const volatilityArr = getPeriodParam(logArr, "volatility", period, 1);

		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			quote["Result " + sd.name] = volatilityArr[i];
		}
	};
	CIQ.Studies.calculateSQNMarketRegime = function (stx, sd) {
		var field = sd.inputs.Field;
		if (!field || field == "field") field = "Close";

		/** 计算前先计算并储存好symbolRatio在sd.chart内 */
		CIQ.stxx.calculateDailyChange(sd.chart);
		var quotes = sd.chart.scrubbed;

		CIQ.Studies.MA("simple", sd.days, 'change', 0, "_MA", stx, sd);

		sd.std = new CIQ.Studies.StudyDescriptor(sd.name, "STD Dev", sd.panel);
		sd.std.chart = sd.chart;
		sd.std.startFrom = sd.startFrom;
		sd.std.days = sd.days;
		sd.std.inputs = {
			Field: 'change',
			"Standard Deviations": 1,
			Type: "simple"
		};
		sd.std.outputs = { "_STD Dev": null };
			// dual symbol new features
			sd.std.parameters = sd.parameters
		CIQ.Studies.calculateStandardDeviationSample(stx, sd.std);

		/** 判断Study用来计算的数据源 */
		if(sd.parameters.isComparison){
			field = CIQ.store.$state.comparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		} 

		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			quote["Result " + sd.name] = 
				(quote["_MA " + sd.name] / quote["_STD Dev " + sd.name]) * Math.sqrt(100);
		}
	};

	CIQ.Studies.calculateHighOverN = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				indicator = Math.max(...(quotes.slice(sliceStart, sliceEnd).map(
					row => getPropertyByString(row,field,subField)
				)))
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};
	CIQ.Studies.calculateLowOverN = function (stx, sd) {
		var quotes = sd.chart.scrubbed;
		var field = sd.inputs.Field;
		var period = sd.inputs.Period;
		if (!field || field == "field") field = "Close";
		/** 用subField代替sd.subField,考虑到sd.subField一直是默认的Close */
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

		let indicator
		for (var i = sd.startFrom; i < quotes.length; i++) {
			if(i+1>=period){
				if (!quotes[i]) continue;
				const sliceStart = i + 1 - period
				const sliceEnd = i + 1
				indicator = Math.min(...(quotes.slice(sliceStart, sliceEnd).map(
					row => getPropertyByString(row,field,subField)
				)))
			}
			quotes[i]["Result " + sd.name] = indicator;
		}
	};


	CIQ.Studies.calculateAmplitude = function (stx, sd) {
		// todo: 考虑从这里开始都替换成scrubbed
		var quotes = sd.chart.scrubbed;
		var field	// 它是流动的
		if(sd.parameters.criteria && sd.parameters.criteria.endsWith('2')){
			field = CIQ.store.$state.comparisonSymbol.url
			quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		}else{
			quotes = sd.chart.scrubbed
		}

		/** myIndicator 区分shift前后的指标 */
		if(window.location.pathname.includes('/myindicator')) {
			const symbolLabel = getCoresSymbolDual(sd.parameters.criteria.endsWith(2))
			let display = `(${symbolLabel}) Amplitude`
			const miShift = CIQ.store.$state.miFormShift
			// 左侧ma
			if(!sd.parameters.criteria.endsWith('2')) {
				sd.inputs.display = display
			}
			else if(miShift.showInput && miShift.display) sd.inputs.display = `${display}(shift-${miShift.value || 0})`
			// myindicator情况下显示带空格的display以区分左侧的ma
			else if(!(miShift.showInput && miShift.display)) sd.inputs.display = `${display} `
		}

		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			var lastBar = quote
			if(i >= 1) lastBar = quotes[i-1]

			
			if(getPropertyByString(lastBar,field,"Close") == 0) return 0
			
			quote[sd.inputs.display] = parseFloat((
				100 * (getPropertyByString(quote,field,"High") - getPropertyByString(quote,field,"Low")) 
				/ getPropertyByString(lastBar,field,"Close")
			).toFixed(4));
		}

		sd.outputMap = {}
		sd.outputMap[sd.inputs.display] = "Result";
	};

	CIQ.Studies.calculateCriteriaScore = function (stx, sd) {
		// todo: 考虑从这里开始都替换成scrubbed
		// var quotes = sd.chart.scrubbed;
		// var field	// 它是流动的
		// if(sd.parameters.criteria && sd.parameters.criteria.endsWith('2')){
		// 	field = CIQ.store.$state.comparisonSymbol.url
		// 	quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
		// }else{
		// 	quotes = sd.chart.scrubbed
		// }
		var quotes = sd.chart.dataSet

		const criteriaCat = sd.parameters.criteria.startsWith('entry') ? 'Entry' : 'Exit'
		const symbolLabel = getCoresSymbolDual(sd.parameters.criteria.endsWith(2))
		let display = `(${symbolLabel}) SameBar Multi-Condition ${criteriaCat} Criteria Score`
		sd.inputs.display = display

		const criteriaScoreList = CIQ.store.$state.criteriaScoreList

		for (var i = sd.startFrom; i < quotes.length; i++) {
			var quote = quotes[i];
			if (!quote) continue;
			
			quote[sd.inputs.display] = criteriaScoreList[i]
		}

		sd.outputMap = {}
		sd.outputMap[sd.inputs.display] = "Result";
	};
	CIQ.Studies.calculateSentimentWithShift = function(stx, sd) {
		const field = sd.inputs.Field;
		const shift = sd.inputs.shift;
		const quotes = sd.chart.scrubbed;
		//const outputField = 'ShiftedSentimentIndicator';  // 固定字段名
		const outputField = sd.inputs.display;

		for (var i = sd.startFrom; i < quotes.length; i++) {
			const sourceIndex = i - shift;
			if (sourceIndex >= 0 && quotes[sourceIndex][field]) {
				quotes[i][outputField] = quotes[sourceIndex][field];
			}
		}

		sd.outputMap = {}
		sd.outputMap[outputField] = "Result";
	};

	/** 注册自定义Study */
	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {
		"MAGap": {
			name: "MAGap",
			overlay: false,
			calculateFN: CIQ.Studies.calculateMovingAverageGap,
			inputs: { Period: 20, Field: "field", Type: "ma", Offset: 0 },
			outputs: { Gap: "#FF0000" }
		},
		"ST MA": {
            name: "Moving Average ",
            overlay: true,
            calculateFN: CIQ.Studies.calculateMovingAverage,
            inputs: { Period: 21, Field: "field", Type: "ma", Offset: 0 },
			outputs: { MA: "#FF000" },
        },
		"ST ROCLike": {
            name: "ROCLike Line",
			seriesFN: function (stx, sd, quotes) {
				CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);

				var showSupLine = (!sd.parameters.showSupLine && sd.parameters.showSupLine!=0)?null:sd.parameters.showSupLine
				var yAxis = CIQ.stxx.panels[sd.panel].yAxis
				CIQ.Studies.drawHorizontal(stx, sd, null, showSupLine, yAxis);
			},
            calculateFN: async function (stx, sd) {
				if(CIQ.findSymbolIndicator(null, sd.inputs.Field)) {
					/** 计算前先计算并储存好tickerOHLCV在sd.chart内 */
					let symbolOhlcvLayout
					var activatedMALayoutList = CIQ.store.$state.activatedMALayout?CIQ.store.$state.activatedMALayout:[]
					// 和sentiment indciator roc不同，symnol的需要定位到具体位置因为可以显示多个
					// 而这也会导致计算函数介入了MAlayout, manageChartLayout功能在还原layout前需要还原MAlayout
					symbolOhlcvLayout = activatedMALayoutList.find(
						(item) => item.criteria == sd.parameters.criteria && item.index == sd.parameters.index
					)
					// 这里做判断的原因是，默认加载时需要异步获取数据并执行计算函数，但是编辑比如切换颜色时异步失效，需特殊处理
					let tickerPairdata = CIQ.store.$state.tickerOhlcvPairdata[symbolOhlcvLayout.ticker] || []
					const shiftOffet = parseInt(sd.inputs.display.match(/shift-(\d+)/)?.[1] || 0, 10);
					if(tickerPairdata.length == 0) {
						await CIQ.Studies.TickerOHLCV("_OHLCV",stx,sd,symbolOhlcvLayout.url,symbolOhlcvLayout.ticker,shiftOffet)
					}else {
						CIQ.Studies.TickerOHLCV("_OHLCV",stx,sd,symbolOhlcvLayout.url,symbolOhlcvLayout.ticker,shiftOffet)
					}
					CIQ.Studies.calculateSymbolROCLike(stx, sd)
				}else CIQ.Studies.calculateSentiROCLike(stx, sd)	
			}, 
            inputs: { Field: "field", condition: "ROC",period: 21,overlay: false},
			outputs: { Result: "auto" },
        },
		"Symbol Open": {
            name: "Symbol Open Line",
            calculateFN: CIQ.Studies.calculateSymbolOhlcv,
            inputs: { Field: "Open",overlay: false},
			//outputs: { "Symbol High": "auto" },
        },
		"Symbol High": {
            name: "Symbol High Line",
            calculateFN: CIQ.Studies.calculateSymbolOhlcv,
            inputs: { Field: "High",overlay: false},
			//outputs: { "Symbol High": "auto" },
        },
		"Symbol Low": {
            name: "Symbol Low Line",
            calculateFN: CIQ.Studies.calculateSymbolOhlcv,
            inputs: { Field: "Low",overlay: false},
			//outputs: { "Symbol High": "#398BFF" },
        },
		"Symbol Close": {
            name: "Symbol Close Line",
            calculateFN: CIQ.Studies.calculateSymbolOhlcv,
            inputs: { Field: "Close",overlay: false},
			//outputs: { "Symbol High": "auto" },
        },
		"Symbol Volume": {
			name: "Symbol Volume Chart",
			range: "0 to max",
			yAxis: { ground: true, initialMarginTop: 0, zoom: 0 },
			seriesFN: CIQ.Studies.createVolumeChart, 
			// calculateFN: async function (stx, sd) {
			// 	var field = sd.inputs.Field
			// 	// 不知道为什么调用TickerOHLCV会改变sd.outputMap, 改用直接复制粘贴内部逻辑
			// 	var quotes = sd.chart.scrubbed;
			// 	/** 
			// 	 * symbol ohlcv改用maLayout管理状态，不是传统tech， 弃用isComparison
			// 	 *  */
			// 	if(sd?.parameters?.criteria && sd?.parameters?.criteria?.endsWith('2')){
			// 		quotes = sd.chart.dataSet.filter(item => item.hasOwnProperty(field))
			// 	}else{
			// 		quotes = sd.chart.scrubbed
			// 	}
			// 	const ohlcvDataMap = new Map();
			// 	let tickerPairdata = CIQ.store.$state.tickerOhlcvPairdata[sd.parameters.ticker] || []
			// 	// 一般来说会在计算函数之前获取数据，这里是做了一层保险
			// 	// (比如API报错或者restoreChartLayout,后者不会调用getMetaData也就不会初始化ohlcv数据)
			// 	if(tickerPairdata.length == 0) {
			// 		tickerPairdata = await CIQ.store.get_ticker_ohlcv_pairdata(sd.parameters.ticker)
			// 	}
			// 	for (const item of tickerPairdata) {
			// 		if (item.DT && item[field] !== undefined) {
			// 			ohlcvDataMap.set(item.DT.getTime(), item);
			// 		}
			// 	}
			// 	// 2. 遍历数据源，匹配并添加/更新属性
			// 	// O(N) 复杂度, N 是 quotes 的长度
			// 	for (var i = sd.startFrom; i < quotes.length; i++) {
			// 		let quote = quotes[i];
			// 		if (!quote) continue;
			// 		var lastBar = quote
			// 		if(i >= 1) lastBar = quotes[i-1]

			// 		const timestamp = quote.DT.getTime();
			// 		const preTimestamp = lastBar.DT.getTime();
					

			// 		// 检查当前项的 DT 是否在 Map 中存在
			// 		if (ohlcvDataMap.has(timestamp) && ohlcvDataMap.has(preTimestamp)) {
			// 			// 如果存在，获取对应的 Close 值
			// 			const ohlcvVal = ohlcvDataMap.get(timestamp);
			// 			const preOhlcvVal = ohlcvDataMap.get(preTimestamp);
			// 			// 还需另外存前后两天的收盘价用来计算Volume着色（不是比较O和C）
			// 			quote["Close " + sd.name] = ohlcvVal['Close'];
			// 			quote["PreClose " + sd.name] = preOhlcvVal['Close'];
			// 			quote["Result _OHLCV " + sd.name] = ohlcvVal[field];
			// 		}
			// 	}
			// 	CIQ.Studies.calculateVolume(stx, sd)
			// }, 
			// calculateFN: async function (stx, sd) {
			// 	CIQ.Studies.TickerOHLCV(sd)
			// 	CIQ.Studies.calculateVolume(stx, sd)
			// },
			calculateFN: function (stx, sd) {
				// 这里和roc加载判断不同，不需要添加await，因为calculateVolume无需等待TickerOHLCV（未知原因）
				CIQ.Studies.TickerOHLCV("_OHLCV",stx,sd,sd.type,sd.parameters.ticker,0)
				CIQ.Studies.calculateVolume(stx, sd)
			},
			inputs: { Field: "Volume",overlay: false},
			outputs: { "Up Volume": "#8cc176", "Down Volume": "#b82c0c" }
		},
		"Symbol Ratio": {
            name: "Symbol Ratio Line",
            calculateFN: CIQ.Studies.calculateSymbolOhlcv,
            inputs: { Field: "Ratio",overlay: false},
			// outputs: { "Symbol Ratios": "#8cc176" },
        },
		"MACDHistGap": {
			name: "MACDHistGap",
			calculateFN: CIQ.Studies.calculateSTMACDGap,
			inputs: {
				"Fast MA Period": 12,
				"Slow MA Period": 26,
				"Signal Period": 9
			},
			outputs: {
				Gap: "auto",
			}
		},
		"UpTrend Pattern": {
			name: "UpTrend Pattern",
			overlay: true,
			calculateFN: CIQ.Studies.calculateHighLowLine,
			inputs: {},
			outputs: {
				Result: "#5B9BD1",
			}
		},
		"DownTrend Pattern": {
			name: "DownTrend Pattern",
			overlay: true,
			calculateFN: CIQ.Studies.calculateHighLowLine,
			inputs: {},
			outputs: {
				Result: "#5B9BD1",
			}
		},
		// new technical indicators in 2024
		"% of Opening Gap": {
            name: "% of Opening Gap",
			inputs: {},
            calculateFN: CIQ.Studies.calculateOpeningGap,
        },
		"Day of Week": {
            name: "Day of Week",
			inputs: {},
            calculateFN: CIQ.Studies.calculateDayofWeek,
        },
		"Month of Year": {
            name: "Month of Year",
			inputs: {},
            calculateFN: CIQ.Studies.calculateMonthofYear,
        },
		"# of Consecutive Days Since an N-Bars High": {
            name: "# of Consecutive Days Since an N-Bars High",
			inputs: { Period: 252, },
            calculateFN: CIQ.Studies.calculateConsecutiveDaysHigh,
        },
		"# of Consecutive Days Since an N-Bars Low": {
            name: "# of Consecutive Days Since an N-Bars Low",
			inputs: { Period: 252, },
            calculateFN: CIQ.Studies.calculateConsecutiveDaysLow,
        },
		"# of Consecutive Days Up": {
            name: "# of Consecutive Days Up",
			inputs: {},
            calculateFN: CIQ.Studies.calculateConsecutiveDaysUp,
        },
		"# of Consecutive Days Down": {
            name: "# of Consecutive Days Down",
			inputs: {},
            calculateFN: CIQ.Studies.calculateConsecutiveDaysDown,
        },
		// "# of Consecutive Days Above a Moving Average": {
        //     name: "# of Consecutive Days Above a Moving Average",
		// 	inputs: { Period: 252, },
        //     calculateFN: CIQ.Studies.calculateConsecutiveDaysAboveMA,
		// 	outputs: {
		// 		"Result": "auto",
		// 		"_MA": 'auto'
		// 	},
        // },
		"# of Consecutive Days Above a Moving Average": {
            name: "# of Consecutive Days Above a Moving Average",
			//overlay: true,
			inputs: { Period: 252, },
			// seriesFN: function(stx, sd, quotes) {
			// 	var parameters = {
			// 		topBand: "Close",
			// 		bottomBand: "_MA " + sd.name,
			// 		topColor: "green",
			// 		bottomColor: "red",
			// 	};
			// 	CIQ.fillIntersecting(stx, 'chart', parameters);
			// 	// CIQ.Studies.displaySeriesAsLine(stx, sd, quotes);

			// 	if (!quotes.length) return;
			// 	var panel = stx.panels[sd.panel];
			// 	if (!panel || panel.hidden) return;

			// 	for (var i in sd.outputMap) {
			// 		if(sd.outputMap[i] == '_MA'){
			// 			panel = stx.panels['chart']
			// 		}
			// 		console.log('panel',i,panel)
			// 		CIQ.Studies.displayIndividualSeriesAsLine(stx, sd, panel, i, quotes);
			// 	}
			// },
			calculateFN: function (stx, sd) {
				CIQ.Studies.calculateConsecutiveDaysAboveMA(stx, sd);
			},
			outputs: {
				"Result": "auto",
				//"_MA": 'auto'
			},
        },
		"# of Consecutive Days Below a Moving Average": {
            name: "# of Consecutive Days Below a Moving Average",
			inputs: { Period: 252, },
			calculateFN: function (stx, sd) {
				CIQ.Studies.calculateConsecutiveDaysBelowMA(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		/**
		 * Since 2024-02-27
		 */
		"# of Consecutive Days With a Rising Moving Average": {
            name: "# of Consecutive Days With a Rising Moving Average",
			inputs: { Period: 252, },
            calculateFN: function (stx, sd) {
				CIQ.Studies.calculateConsecutiveDaysRisingMovingAverage(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		"# of Consecutive Days With a Declining Moving Average": {
            name: "# of Consecutive Days With a Declining Moving Average",
			inputs: { Period: 252, },
            calculateFN: function (stx, sd) {	
				CIQ.Studies.calculateConsecutiveDaysDecliningMovingAverage(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		"Deviation From Trend Between Two Moving Averages": {
            name: "Deviation From Trend Between Two Moving Averages",
			inputs: { periodShort:4, periodLong: 40},
            calculateFN: function (stx, sd) {	
				CIQ.Studies.calculateDeviationFromTrendBetweenTwoMovingAverages(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		"Percentage Above N-Bars Low": {
            name: "Percentage Above N-Bars Low",
			// inputs: { Period: 252 },
			inputs: { Period: 252 },
            calculateFN: CIQ.Studies.calculatePercentageAboveNDayLow,
        },
		"Percentage Below N-Bars High": {
            name: "Percentage Below N-Bars High",
			inputs: { Period: 252 },
            calculateFN: CIQ.Studies.calculatePercentageBelowNDayHigh,
        },
		"N-Day Realized Volatility": {
            name: "N-Day Realized Volatility",
			inputs: { period: 21 },
            calculateFN: function (stx, sd) {	
				CIQ.Studies.calculateNDayRealizedVolatility(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		"SQN Market Regime": {
            name: "SQN Market Regime",
			inputs: { Period: 100 },
            calculateFN: function (stx, sd) {	
				CIQ.Studies.calculateSQNMarketRegime(stx, sd);
			},
			outputs: {
				"Result": "auto",
			},
        },
		"N-Bars High": {
            name: "N-Bars High",
			inputs: { Period: 21, },
            calculateFN: CIQ.Studies.calculateHighOverN,
        },
		"N-Bars Low": {
            name: "N-Bars Low",
			inputs: { Period: 21, },
            calculateFN: CIQ.Studies.calculateLowOverN,
		},
		"Amplitude": {
            name: "Amplitude",
			inputs: {},
            calculateFN: CIQ.Studies.calculateAmplitude,
			outputs: { Result: "auto" },
        },
		"CriteriaScore": {
            name: "CriteriaScore",
			inputs: {},
            calculateFN: CIQ.Studies.calculateCriteriaScore,
			outputs: { Result: "auto" },
        },
		"ShiftedSentimentIndicator": {
            name: "ShiftedSentimentIndicator",
			inputs: { shift: 0 },
            calculateFN: CIQ.Studies.calculateSentimentWithShift,
        },
	});


	function getPeriodParam(dataSeries, paramType, period, add_bar) {
		const typeDict = {
			max: arr => Math.max(...arr),
			min: arr => Math.min(...arr),
			mean: arr => arr.reduce((a, b) => a + b) / arr.length,
			sum: arr => arr.reduce((a, b) => a + b),
			maxCount: arr => {
			let p1 = 0
			let p2 = 0
			let maxNum = arr[0]
			for(var i in arr){
				if(arr[i]<maxNum){
					p2++
				}else{
					maxNum = arr[i]
					p1 = p2
				}
			}
			return p2-p1
			},
			minCount: arr => {
			let p1 = 0
			let p2 = 0
			let minNum = arr[0]
			for(var i in arr){
				if(arr[i]>minNum){
					p2++
				}else{
					minNum = arr[i]
					p1 = p2
				}
			}
			return p2-p1
			},
			volatility: arr => {
				// 计算平均值
				const mean = arr.reduce((sum, num) => sum + num, 0) / arr.length;
			
				// 计算方差
				const squaredDifferences = arr.map(num => Math.pow(num - mean, 2));
				const variance = squaredDifferences.reduce((sum, squaredDiff) => sum + squaredDiff, 0) / (arr.length-1);
			
				// 计算标准差
				const standardDeviation = Math.sqrt(variance);
				
				const volatilityValue = standardDeviation * 100 * Math.sqrt(252)

				return volatilityValue;
			}
		};
		
		const dataArr = [];

		// 处理range rank, drawndown以及新加的ConsecutiveDays的计算时，
		// 如果当前bar之前的交易日个数小于周期，按剩余天数算
		for (let i = 0; i < dataSeries.length; i++) {

			const sliceStart = i - period + add_bar
			const sliceEnd = i + add_bar
			const tmpData = typeDict[paramType](dataSeries.slice(sliceStart<0?0:sliceStart, sliceEnd).filter(item=>!isNaN(item)));
			
			//dataArr.push(Number(tmpData.toFixed(3)));
			dataArr.push(Number(tmpData));
		}

		return dataArr;
		}
	// function formatData(data) {
	// 	if(data == null){
	// 		data = []
	// 	}
		
	// 	var newQuotes = [];
	// 	if('High' in data[0]){
	// 		for (var i = 0; i < data.length; i++) {
	// 			newQuotes[i] = {};
				
	// 			newQuotes[i].DT = formatStandardTime(data[i].DT)   
	// 			newQuotes[i].Open = data[i].Open;
	// 			newQuotes[i].High = data[i].High;
	// 			newQuotes[i].Low = data[i].Low;
	// 			newQuotes[i].Close = data[i].Close;
	// 			newQuotes[i].Volume = data[i].Volume;  
	// 		} 
	// 	}else{
	// 		for (var i = 0; i < data.length; i++) {
	// 			newQuotes[i] = {};
	
	// 			newQuotes[i].DT = formatStandardTime(data[i].DT)
	// 			newQuotes[i].Open = data[i].Close;
	// 			newQuotes[i].High = data[i].Close;
	// 			newQuotes[i].Low = data[i].Close;
	// 			newQuotes[i].Close = data[i].Close;
				
	// 			if(data[i].Volume){
	// 				newQuotes[i].Volume = data[i].Volume
	// 			}
	// 		}
	// 	}
	// 	return newQuotes
	// 	}
	function formatData(data,barOffset=0) {
        if(data == null){
            data = []
        }
        var newQuotes = [];
        if('High' in data[0]){
            for (var i = 0; i < data.length; i++) { 
                let shiftedIndex = i + barOffset; // 计算新的索引位置

                if (shiftedIndex >= 0 && shiftedIndex < data.length) { // 确保索引在范围内
                    newQuotes.push({
                        DT: data[shiftedIndex].DT,
                        Open: data[i].Open,
                        High: data[i].High,
                        Low: data[i].Low,
                        Close: data[i].Close,
                        Volume: data[i].Volume
                    });
                }
            } 
        }else{
            for (var i = 0; i < data.length; i++) {
                let shiftedIndex = i + barOffset; // 计算新的索引位置

                if (shiftedIndex >= 0 && shiftedIndex < data.length) { // 确保索引在范围内
                    newQuotes.push({
                        DT: data[shiftedIndex].DT,
                        Open: data[i].Close,
                        High: data[i].Close,
                        Low: data[i].Close,
                        Close: data[i].Close,
                    });
                }
                
                if(data[i].Volume){
                    newQuotes[i].Volume = data[i].Volume
                }
            }
        }
        return newQuotes
     }
}

};
export {__js_st_studies_customized_}
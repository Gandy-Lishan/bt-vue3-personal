/**
 *	2.2.0
 *	contains customized functions related to indicator loading and CSV output file generation
 */
 import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
 import {config} from "../../examples/feeds/STDataFeedAccessUrl"
 import {maxNumOfStudy,recoverSymbolOptixUrl,getCoresSymbolDual, formatStandardTime} from '@/shared/lib/chartiq/utils'
 import qs from 'querystring'
 import {
    searchIndicator,
    getPairData
  } from '@/shared/lib/chartiq/service-stub'

 let __st_js_loadIndicator_ = (_exports) => {
 /* global _CIQ, _timezoneJS, _SplinePlotter */
 
 var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
 
 CIQ.uploadCSVJSON = async function(pk,callback) {
    // lishan 仅仅用于上传 csv json 文件
    CIQ.stxx.resizeChart();
    CIQ.stxx.draw();
    
    let csvContent = CIQ.exportEx();
    let csvContent2
    // dual symbol
    const comparisonSymbol = CIQ.store.$state.comparisonSymbol || { url: null, name: null }
    if(comparisonSymbol.url){
        csvContent2 = CIQ.exportEx2(comparisonSymbol.url);
    }
    console.log("csvContent created Success");

    let promise = 200
    try {
      let S3DataStr = qs.stringify({ file_name: pk + '/' + pk + '_backtest_data.csv', file_data: csvContent })
      let data = await uploadS3(S3DataStr)
      console.log("Upload csv Success", data);

      if(csvContent2){
        let S3DataStr2 = qs.stringify({ file_name: pk + '/' + pk + '_backtest_data2.csv', file_data: csvContent2 })
        let data2 = await uploadS3(S3DataStr2)
        console.log("Upload csv2 Success", data2);
      }
      promise = 200
    } catch (error) {
      console.log("Error", error);
      promise = 500
    }

    await callback(promise);
 }

 function uploadS3(S3DataStr) {
     const url = '/dev/dev/upload/'
     return new Promise((resolve,reject)=>{
         CIQ.axios.post(url,S3DataStr,{withCredentials: true})
         .then(res=>{
             resolve(res)
         }).catch(err=>{
             reject(err)
         })
     })
 }
 /**
  * the main functionality of it is to update indicator list on chart,
  *  maybe it would be better if we call it "updateIndicatorList"
  * @param {*} params 
  * type:
  *     'updateIndicators':更新indicator列表，用于加载/移除单个indicator,切换Timeframe, 切换Symbol
  *     'loadFromBacktest':从view/edit/rerun进入，根据backtestInfo还原图表
  *     'addBuiltTech':从chartiq Study列表载入technical indicator,无需发pairdata
  *     'outputSignalsResult': runbacktest 调用，在回调处生成并上传csv数据
  * stx:
  *     chartiq stx实例，有的生命周期CIQ.stxx获取不到，需要手动传入
  * @param {*} callback 
  * @returns Promise
  */
 CIQ.addIndicators = async function(params,callback){
        let {
            stx=CIQ.stxx,
            type='updateIndicators',
            pk
        } = params

        // 限制同屏显示个数
        if(maxNumOfStudy(stx)) return

        /** 如果type为loadFromBakctest或者outputSignalsResult的话，
         * 和his/fav绑在一起，所以不用加 */
        if(type == 'updateIndicators' || type == 'addBuiltTech'){
            CIQ.addCover()
            CIQ.nprogress.start()
        }

        let indicatorsList = [
            ...CIQ.store.$state.indicators.formIndicators.entry,
            ...CIQ.store.$state.indicators.formIndicators.exit,
            ...CIQ.store.$state.indicators.formIndicators.entry2,
            ...CIQ.store.$state.indicators.formIndicators.exit2
        ]
        // remove redundant elements and empty string
        for(var i=0;i<indicatorsList.length;i++){
            if(indicatorsList[i]=='' || indicatorsList[i]==undefined){
            indicatorsList.splice(i,1)
            i--;
            }
        }

        /** 如果type为loadFromBakctest或者outputSignalsResult的话,
         * 不需要加载额外Studies */
        if(type == 'updateIndicators' || type == 'addBuiltTech'){
            indicatorsList = indicatorsList.concat(CIQ.store.$state.indicators.extraIndicators)
        }
         
        /** 去重 */
         const set = new Set(indicatorsList)
         indicatorsList = [...set]
         
         //  load saved indicator layouts from stxx.layout
         var savedTechSD = []
         if(type == 'updateIndicators' || type == 'addBuiltTech'){
            /** 这个加载indicatorlist时保存savedTechSD的逻辑是错误又多余的，只有在runbt时运行saveIndicatorLayoutData才会保存其值，rerun也只是直接读取其值再运行 */
            for(var i in stx.layout.studies){
                /** 跳过非参与回测的indicator */
                //if(CIQ.store.$state.indicators.extraIndicators.includes(stx.layout.studies[i].type)) continue
                /** 跳过MA指标,MA只靠MALayout维护 */
                // if(stx.layout.studies[i].type == 'ma') continue
                if(CIQ.store.$state.maLikeTech.includes(stx.layout.studies[i].type)) continue
                savedTechSD.push({
                    type: stx.layout.studies[i].type,
                    inputs: stx.layout.studies[i].inputs,
                    outputs: stx.layout.studies[i].outputs,
                    parameters: stx.layout.studies[i].parameters,
                    panel: stx.layout.studies[i].panel
                })
            }
         }else{
            /** 如果type为loadFromBakctest或者outputSignalsResult的话,
             * vuex有techSD则存入savedTechSD */
            savedTechSD = CIQ.store.$state.techSD
         }
         CIQ.store.set_saved_tech_sd(savedTechSD)
 
         // sort indicatorsList into a "[senti,tech]" style
         let technicalIndicators = []
         for(var item in indicatorsList){
             if(CIQ.findBuiltinTechIndicator(null,indicatorsList[item])){
                 technicalIndicators.push(indicatorsList[item])
                 indicatorsList[item] = ''
             }    
         }
         indicatorsList = indicatorsList.concat(technicalIndicators).filter(item=>{return item !== ''})

         /** 加载前获取study数量以预先设置chartiq高度 */
        //  CIQ.store.commit('chart/updateStudiesCount',indicatorsList.length)

        /** 不参与请求 */
        if(type == 'addBuiltTech') {
            // fetch indicator information and add studies to chart
            await CIQ.getIndicatorMatedata(indicatorsList,stx)
            CIQ.store.set_isMarkerShown_flag(false)
            CIQ.hideCover()
            CIQ.nprogress.done()
            return
        }
        if(CIQ.store.$state.backtestSymbol){
            CIQ.symbol = CIQ.store.$state.backtestSymbol
        }
        /** dual symbol:
        * addSeire前移除当前序列,防止出现多个序列 */
        for(var s in stx.chart.series){
            var series=stx.chart.series[s];
            stx.removeSeries(series);
        }
        await new Promise((resolve) => {
            stx.loadChart({ symbol: CIQ.symbol,startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(), indicator:indicatorsList}, async function () {
                const commonOperations = async () => {
                    /* 一系列chart加载完成后的操作 */
                    /** dual symbol,setRestoreFreq从pairdata 226行转移到了loadChart回调，保证view时addSeires仍持有未被清空的restoreFreq*/ 
                    CIQ.store.set_restore_freq('')
    
                    // fetch indicator information and add studies to chart
                    /** 必须放在pairdata后，不然study在数据刷新后还得再计算 */
                    await CIQ.getIndicatorMatedata(indicatorsList,stx)
                    /** !(_type == 'loadFromBacktest') */
                    if(type == 'updateIndicators'){
                        CIQ.store.set_isMarkerShown_flag(false)
                        }
                        
                    if(type == 'outputSignalsResult'){
                        /** load Indicators when run a new backtest
                         * outputSignalsResult只保留csv 生成和upload逻辑 */
                        stx.resizeChart();
                        stx.draw();
                        var csvContent = CIQ.exportEx()
                        var csvContent2
                        // dual symbol
                        if(comparisonSymbol.url){
                            csvContent2 = CIQ.exportEx2(comparisonSymbol.url);
                        }
        
                        var promise = 200
                        try {
                            var S3DataStr = qs.stringify({ file_name: pk + '/' + pk + '_backtest_data.csv', file_data: csvContent })
                            var data = await uploadS3(S3DataStr)
                            console.log("Upload csv Success", data);
        
                            // dual symbol
                            if(csvContent2){
                            var S3DataStr2 = qs.stringify({ file_name: pk + '/' + pk + '_backtest_data2.csv', file_data: csvContent2 })
                            var data2 = await uploadS3(S3DataStr2)
                            console.log("Upload csv2 Success", data2);
                            }
                            promise = 200
                        } catch (error) {
                            console.log("Error", error);
                            promise = 500
                        }
                        await callback(promise);
                        resolve()
                    }else {
                        if(callback){
                            callback()  
                        }else{ 
                            CIQ.hideCover()
                            CIQ.nprogress.done()
                        }
                        resolve()
                    } 
                    
                    CIQ.resetSupportLineWithChannel()
                }; 
                const comparisonSymbol = CIQ.store.$state.comparisonSymbol || { url: null, name: null }
                await CIQ.addComparison(stx, comparisonSymbol, commonOperations)
                favBtnContainerToggle()
         })
        })
 }

 CIQ.addComparison = async function(stx, comparison, cb) {
    const {url,name} = comparison
    if(url){
        /** dual symbol */
        var start = config.timestampToTime(CIQ.initialDate.start)
        var end = config.timestampToTime(CIQ.initialDate.end)
        const res = await getPairData( start, end, CIQ.store.$state.pairDataFreq, url)
        let _data = formatData(res.data)
        stx.addSeries(url, {
            highlightable: false,
            display:name, 
            data:_data,
            isComparison: false, 
            color: "#368DF0",
            permanent: true,
            // This setting is only applicable when using the primary y-axis and has no effect when using a renderer that has its own axis.        
            yAxis:{ 
                position:"left",
                textStyle:"#FFBE00"
            },
        },cb);    // 确保addSeries后再触发后续逻辑以及最后的回调，最终确保study在数据源出现后加载以及csv的生成时机正确
    }else cb();
 }
 const formatData = function(data) {
    if(data == null){
        data = []
    }
    
    var newQuotes = [];
    if('High' in data[0]){
        for (var i = 0; i < data.length; i++) {
            newQuotes[i] = {};
            
            newQuotes[i].DT = formatStandardTime(data[i].DT)   
            newQuotes[i].Open = data[i].Open;
            newQuotes[i].High = data[i].High;
            newQuotes[i].Low = data[i].Low;
            newQuotes[i].Close = data[i].Close;
            newQuotes[i].Volume = data[i].Volume;  
        } 
    }else{
        for (var i = 0; i < data.length; i++) {
            newQuotes[i] = {};

            newQuotes[i].DT = formatStandardTime(data[i].DT)
            newQuotes[i].Open = data[i].Close;
            newQuotes[i].High = data[i].Close;
            newQuotes[i].Low = data[i].Close;
            newQuotes[i].Close = data[i].Close;
            
            if(data[i].Volume){
                newQuotes[i].Volume = data[i].Volume
            }
        }
    }
    return newQuotes
 }

 // endDate为推荐日当天
 CIQ.initiateChart = function(indicatorsList,endDate,callback){
     const standardEndDate = formatStandardTime(endDate)
     CIQ.stxx.loadChart(	{ symbol: CIQ.symbol,startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:standardEndDate, indicator:indicatorsList}, function () {
         // 加载marker前先清空
         //CIQ.hideMarker()
         CIQ.store.set_isMarkerShown_flag(false)
         
         if(callback){
             callback()
         }
     })
 }
 /** global symbol loading function, 
  * including chart initation,lookup component, addSymbol from setup form*/
 CIQ.addSymbol = async function(symbol,stx,callback){
    /** addIndicators会读取存入的symbol并用于loadChart */
    CIQ.store.getBacktestSymbol(ymbol)

    CIQ.addIndicators({stx:stx},callback)
    // favBtnContainerToggle()
 }
 const favBtnContainerToggle = async function() {
    try{
        await CIQ.store.get_favorite()
        const favoriteSymbolList = CIQ.store.$state.favoriteSymbolList
        try{
            var count=0;
            for(var item in favoriteSymbolList){
                if(favoriteSymbolList[item] == CIQ.stxx.chart.symbol){
                    // del
                    CIQ.addSymbolCookie()
                    count++
                }
            }
            if (count === 0){
                // add
                CIQ.delSymbolCookie()
            }
        }catch(e){
            //console.error(e)
        }
    }catch(e){
        //console.error(e)
    }
}

 // fetch indicator information and add studies to chart
 // 封装成了一个promise函数
 // 原版
 CIQ.getIndicatorMatedata2 = function(indicatorList,stx){
    var senti_color = ["#000000"]
    var tech_color_1 = ["#5B9BD1","#368DF0"]
    var tech_color_2 = ["#000000","#6b7280"]
    if(!stx) return
    for (var studyInstanceName in stx.layout.studies) {  
       var sd = stx.layout.studies[studyInstanceName]; 
       CIQ.Studies.removeStudy(stx, sd); 
    }
    //let indicatorHeight = CIQ.setPanelHeight(indicatorList)

    let resArr = []
    let sentiUrlList = []
    return new Promise(async resolve=>{
        for(var i in indicatorList){
            // 是tech
            let indicatorObj = CIQ.findBuiltinTechIndicator(null,indicatorList[i]) || CIQ.findSymbolIndicator(indicatorList[i],null) 
            if(indicatorObj){
                   let techSymbolName = indicatorObj.value?indicatorObj.value:indicatorObj.label
                    // load technical study, no need for adding MA
                    // if it's a technical study, skip sending query

                   if(CIQ.store.$state.maLikeTech.includes(indicatorList[i])){
                       for(var j in CIQ.store.$state.activatedMALayout){
                           if(CIQ.store.$state.activatedMALayout[j].url == indicatorList[i]){
                               /** 指示Study归属的Symbol */
                               const criteria = CIQ.store.$state.activatedMALayout[j].criteria;
                               const symbolLabel = getCoresSymbolDual(criteria && criteria.endsWith('2'))
                               const inputs = indicatorList[i] == 'ma'
                                   ? {
                                       //display: `(${symbolLabel})${techSymbolName}`, //可以不用在这里设定，在sttooltip统一设定命名规则了
                                       Type: CIQ.store.$state.activatedMALayout[j].type,
                                       Field: CIQ.store.$state.activatedMALayout[j].field,
                                       Period: CIQ.store.$state.activatedMALayout[j].period,
                                   }
                                   : {
                                       // 目前来说maLikeTech就一个ma
                                       //display: `(${symbolLabel})${techSymbolName}`
                                   }
                               const ma_color = CIQ.store.getColorByCriteriaAndIndex(criteria, j)
                               const outputs = indicatorList[i] == 'ma' ? { MA: ma_color } : null
                               var sd = CIQ.Studies.addStudy(stx, indicatorList[i],inputs,outputs,{
                                   criteria: CIQ.store.$state.activatedMALayout[j].criteria,
                                   index: CIQ.store.$state.activatedMALayout[j].index
                               })   
                               debugger
                           }  
                       }
                   }else{
                       // if no savedTechSD exit, load normal study         
                       var count = 0 
                       for(var j in CIQ.store.$state.savedTechSD){       /** 现在考虑到可能有多个tech indicator,url === study.type的判断不再适用 */
                           if(indicatorList[i] == CIQ.store.$state.savedTechSD[j].type){
                               count++
                               // var study = CIQ.Studies.studyLibrary[indicatorList[i]]
                               // study.panelHeight=indicatorHeight
                               // CIQ.Studies.studyLibrary[indicatorList[i]] = study
                               const isComparison = CIQ.store.$state.savedTechSD[j].parameters.isComparison;
                               const symbolLabel = getCoresSymbolDual(isComparison)
                               CIQ.store.$state.savedTechSD[j].inputs.display = `(${symbolLabel})${techSymbolName}` //savedTechSD更新display，为了兼容display有问题的回测并修改它
                               var sd = CIQ.Studies.addStudy(stx, indicatorList[i],CIQ.store.$state.savedTechSD[j].inputs, CIQ.store.$state.savedTechSD[j].outputs, CIQ.store.$state.savedTechSD[j].parameters, CIQ.store.$state.savedTechSD[j].panel); 
                           }
                       }
                       if(count==0){                                                         
                           // var study = CIQ.Studies.studyLibrary[indicatorList[i]]
                           // study.panelHeight=indicatorHeight
                           // CIQ.Studies.studyLibrary[indicatorList[i]] = study
                           let activatedTechLayout = CIQ.store.$state.activatedTechLayout
                           activatedTechLayout.forEach(item=>{
                               if(item.criteria && item.criteria.endsWith("2")){
                                   item.symbolType = 'symbol2'
                               }else item.symbolType = 'symbol1'
                           })
                           var urlMap = {};
                           for(var j in activatedTechLayout){
                               var url = activatedTechLayout[j].url
                               var symbolType = activatedTechLayout[j].symbolType
                               if(url == indicatorList[i]){
                                       // 检查该 URL 和 stockType 是否已经存在于 urlMap 中
                                       if (!urlMap.hasOwnProperty(url)) {
                                           urlMap[url] = {};
                                       }

                                       if (!urlMap[url].hasOwnProperty(symbolType)) {
                                           urlMap[url][symbolType] = true; // 添加当前 stockType 到 urlMap[url]
                                       } else {
                                           // 如果 URL 和 stockType 已经存在，则过滤掉当前元素
                                           continue;
                                       }
                                       const criteria = CIQ.store.$state.activatedTechLayout[j].criteria;
                                       const symbolLabel = getCoresSymbolDual(criteria && criteria.endsWith('2'))
                                       var sd = CIQ.Studies.addStudy(stx, indicatorList[i],{
                                           display:`(${symbolLabel})${techSymbolName}`
                                       },null,{
                                           // 新加了一个isComparison属性，专门用来判断是否归属symbol2，而不是用criteria判断
                                           isComparison: symbolType=='symbol2',
                                       });          
                               }
                           }
                       }
                   }

                    if(CIQ.findSymbolIndicator(indicatorList[i],null)){
                        if(CIQ.store.$state.beforeCalculateNewConditions == false){
                            CIQ.store.envoke_before_calculate_newConditions(true)
                        }else{
                            CIQ.store.envoke_before_calculate_newConditions(false)
                        }              
                    }

                    for(var j in CIQ.store.$state.activatedMA){       
                       /** 指示Study归属的Symbol */
                       const activatedMAObj = CIQ.store.$state.activatedMA[j];                     
                        if((activatedMAObj.url != '')&&(activatedMAObj.url == indicatorList[i])){
                           const ma_color = CIQ.store.getColorByCriteriaAndIndex(activatedMAObj.criteria, j)
                           if(CIQ.store.$state.activatedMA[j].url == 'ma'){
                                // 直接加载，信息都更新再studylibrary
                                let type   //这里是存activatedMA时没有把SMA转换成simple, 加的兼容错误版本补丁
                                if(['SMA','EMA'].includes(activatedMAObj.type)) type = activatedMAObj.type == 'SMA'?'simple':'exponential'
                                
                                var sd = CIQ.Studies.addStudy(stx, 'ST MA', {
                                    Type: type ? type : activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                    Period: activatedMAObj.period,
                                    display: 'ST MA',
                                },{ MA: ma_color },{
                                    criteria: activatedMAObj.criteria,
                                    index: activatedMAObj.index
                                })
                            }else{
                                sd = CIQ.Studies.addStudy(stx, "ST MA",{
                                    Type: activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                    Period: activatedMAObj.period,
                                    display:"ST MA",
                                    Field: activatedMAObj.url
                                },{ MA: ma_color },{
                                    criteria: activatedMAObj.criteria,
                                    index: activatedMAObj.index
                                });
                            }    
                        }   
                    }
                    continue

            }
            // 之后加一个symbol判断和小李新senti判断
           /********************lishan modify start*************************/
           if(CIQ.isUserIndicator(indicatorList[i]) || CIQ.isOwnIndicator(indicatorList[i])){
               let res = await searchIndicator(indicatorList[i].split('CREATE')[0]);
               debugger
               const ownIndicatorInfo = res?.data?.results[0];

           /********************lishan modify end*************************/
                var newStudy = {
                    inputs: { Period: 13, Overlay: false},
                    outputs: 
                    {indicatorClose:senti_color[i%1],description: '',url:indicatorList[i]},
                   //  panelHeight:indicatorHeight,
                    parameters: { init: {
                        studyOverZonesEnabled: true,
                        studyOverBoughtValue: ownIndicatorInfo?Math.round(ownIndicatorInfo.lower_extreme_value*1000)/1000:999,
                        studyOverBoughtColor: process.env.VUE_APP_RED,
                        studyOverSoldValue: ownIndicatorInfo?Math.round(ownIndicatorInfo.upper_extreme_value*1000)/1000:-999,
                        studyOverSoldColor: process.env.VUE_APP_GREEN
                    }},
                    attributes:{
                        studyOverBoughtValue:{"step":0.001},
                        studyOverSoldValue:{"step":0.001}
                    }
                }
                
                var str = JSON.stringify(newStudy);                                   
                str = str.replace(/indicatorClose/g, indicatorList[i]);
                newStudy = JSON.parse(str)                                     
                
                CIQ.Studies.studyLibrary[indicatorList[i]] = newStudy
                var count = 0
               /********************lishan modify start*************************/
               var indicatorName = indicatorList[i].match(/(CREATE|HASH)/) ? indicatorList[i].split(/(CREATE|HASH)/)[0] : indicatorList[i]
               /********************lishan modify end*************************/
                for(var j in CIQ.store.$state.savedTechSD){
                    if(indicatorList[i] == CIQ.store.$state.savedTechSD[j].type){
                        count++
                        CIQ.store.$state.savedTechSD[j].inputs.display = indicatorName //savedTechSD更新display，为了兼容display有问题的回测并修改它
                        var sd = CIQ.Studies.addStudy(stx, indicatorList[i],CIQ.store.$state.savedTechSD[j].inputs,null, CIQ.store.$state.savedTechSD[j].parameters, CIQ.store.$state.savedTechSD[j].panel);
                    }
                }
                if(count==0){
                    var sd = CIQ.Studies.addStudy(stx,indicatorList[i],{display:indicatorName})   
                }

                var newExtremeValue = {indicator:indicatorList[i],extremeOptimism:sd.parameters.studyOverBoughtValue,extremePessimism:sd.parameters.studyOverSoldValue}
                var extremeValueList = CIQ.store.$state.extremeValue
                extremeValueList.push(newExtremeValue)
                CIQ.store.set_extreme_value(extremeValueList)
                
                // load moving average lines that attach to sentiment indicator
                for(var j in CIQ.store.$state.activatedMA){       
                   /** 指示Study归属的Symbol */
                   const activatedMAObj = CIQ.store.$state.activatedMA[j];     
                    if((activatedMAObj.url != '')&&(activatedMAObj.url == indicatorList[i])){
                        const ma_color = CIQ.store.getColorByCriteriaAndIndex(activatedMAObj.criteria, j)
                        if(activatedMAObj.url == 'ma'){
                            var sd = CIQ.Studies.addStudy(stx, 'ST MA', {
                                Type: activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                Period: activatedMAObj.period,
                                display: 'ST MA',
                            },{ MA: ma_color },{
                                criteria: activatedMAObj.criteria,
                                index: activatedMAObj.index
                            })
                        }else{    
                            var sd = CIQ.Studies.addStudy(stx, "ST MA",{
                                Type: activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                Period: activatedMAObj.period,
                                display:"ST MA",
                                Field: activatedMAObj.url
                            },{ MA: ma_color },{
                                criteria: activatedMAObj.criteria,
                                index: activatedMAObj.index
                            });
                        }    
                    }   
                }
                continue
            }

            var queryUrl =  config.indicatorMetadata + 
            "?indicator=" + recoverSymbolOptixUrl(indicatorList[i]);
            let _res = new Promise((resolve,reject)=>{ 
                CIQ.axios.get(
                    queryUrl,
                ).then(res=>{
                    resolve(res.data)
                }).catch(err=>{
                    reject(err)
                })
            })
            resArr.push(_res)
            sentiUrlList.push(indicatorList[i])
        }

        // handle all response for sentiment indicator information and load them
        Promise.all(resArr).then(res => {
            var newQuotes = res;
            
            for(var i in newQuotes){
                if (newQuotes[i] !== null){
                    var newStudy = {
                        inputs: { Period: 13, Overlay: false},
                        outputs: 
                        {indicatorClose:senti_color[i%1],description: newQuotes[i].description,url:sentiUrlList[i]},
                       //  panelHeight:indicatorHeight,
                        parameters: { init: {
                            studyOverZonesEnabled: true,
                            studyOverBoughtValue: newQuotes[i].opt_extreme?Math.round(newQuotes[i].opt_extreme*1000)/1000:NaN,
                            studyOverBoughtColor: process.env.VUE_APP_RED,
                            studyOverSoldValue: newQuotes[i].pess_extreme?Math.round(newQuotes[i].pess_extreme*1000)/1000:NaN,
                            studyOverSoldColor: process.env.VUE_APP_GREEN
                        }},
                        attributes:{
                            studyOverBoughtValue:{"step":0.001},
                            studyOverSoldValue:{"step":0.001}
                        }
                    }
                    
                        var str = JSON.stringify(newStudy);                                   
                        str = str.replace(/indicatorClose/g, sentiUrlList[i]);
                        newStudy = JSON.parse(str)                                     
                        
                        CIQ.Studies.studyLibrary[sentiUrlList[i]] = newStudy
                        var count = 0
                        let sentiName = CIQ.findSentiIndicator(null,sentiUrlList[i])?.chart_name
                        for(var j in CIQ.store.$state.savedTechSD){
                            if(sentiUrlList[i] == CIQ.store.$state.savedTechSD[j].type){
                                count++
                                CIQ.store.$state.savedTechSD[j].inputs.display = sentiName //savedTechSD更新display，为了兼容display有问题的回测并修改它
                                var sd = CIQ.Studies.addStudy(stx, sentiUrlList[i],CIQ.store.$state.savedTechSD[j].inputs,null, CIQ.store.$state.savedTechSD[j].parameters, CIQ.store.$state.savedTechSD[j].panel);
                            }
                        }
                        if(count==0){
                            var sd = CIQ.Studies.addStudy(stx, sentiUrlList[i],{display:sentiName})    
                            debugger
                        }
        
                        var newExtremeValue = {indicator:sentiUrlList[i],extremeOptimism:sd.parameters.studyOverBoughtValue,extremePessimism:sd.parameters.studyOverSoldValue}
                        var extremeValueList = CIQ.store.$state.extremeValue
                        // if(!extremeValueList.some((item)=>{return item.indicator == newExtremeValue.indicator})){
                            extremeValueList.push(newExtremeValue)
                        //}
                        CIQ.store.set_extreme_value(extremeValueList)
                    // stxx.panels[sd.panel].yAxis
                    
                }
                // load moving average lines that attach to sentiment indicator
                for(var j in CIQ.store.$state.activatedMA){  
                   /** 指示Study归属的Symbol */
                   const activatedMAObj = CIQ.store.$state.activatedMA[j];       
                    if((activatedMAObj.url != '')&&(activatedMAObj.url == sentiUrlList[i])){
                        const ma_color = CIQ.store.getColorByCriteriaAndIndex(activatedMAObj.criteria, j)
                        if(activatedMAObj.url == 'ma'){
                            var sd = CIQ.Studies.addStudy(stx, 'ST MA', {
                                Type: activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                Period: activatedMAObj.period,
                                display: 'ST MA',
                            },{ MA: ma_color },{
                                criteria: activatedMAObj.criteria,
                                index: activatedMAObj.index
                            })
                        }else{    
                            var sd = CIQ.Studies.addStudy(stx, "ST MA",{
                                Type: activatedMAObj.type, //还原stma新加的ma type(sma or ema)
                                Period: activatedMAObj.period,
                                display:"ST MA",
                                Field: activatedMAObj.url
                            },{ MA: ma_color },{
                                criteria: activatedMAObj.criteria,
                                index: activatedMAObj.index
                            });
                        }    
                    }   
                }
            }   
            resolve()                     
        }).catch(err => {
            
        })
    })

}

// 实现批处理的metadata, 并优化结构, 把addStudyToChart提取出
  CIQ.getIndicatorMatedata = async function(indicatorList, stx) {
    if (!stx) return; // If no stx, nothing to do.

    // Clear existing studies from the chart
    //console.log('*************Clear existing studies from the chart',stx.layout.studies,CIQ.store.$state.activatedMA)
    for (const studyInstanceName in stx.layout.studies) {
        //console.log('removeStudy', stx.layout.studies[studyInstanceName].type)
        CIQ.Studies.removeStudy(stx, stx.layout.studies[studyInstanceName]);
    }
    //console.log('****************Clear existing studies from the chart Done')
    const senti_color = document.querySelector("cq-context").classList.value.indexOf("ciq-night") != -1 ? ["#FFFFFF"] : ["#000000"];
    // const tech_color_1 = ["#5B9BD1", "#368DF0"]; // Not used in the provided code
    // const tech_color_2 = ["#000000", "#6b7280"]; // Not used in the provided code

    let sentiUrlList = []; // For sentiment indicators requiring API calls
    let studiesToLoad = []; // Unified list for all studies to be added

    // --- Helper Function: Add a study to the chart and handle related logic ---
    // This function encapsulates the logic for adding a study,
    // updating extreme values, and attaching MAs.
    const addStudyToChart = async (studyType, inputs, outputs, parameters, panel, indicatorKey, extremeInfo = null) => {
        // TODO symbol ohlcv特殊处理，在addStudy之前先获取异步数据源, 因为在计算函数内获取数据无法异步处理
        if(CIQ.findSymbolIndicator(studyType)) {  
            await CIQ.store.get_ticker_ohlcv_pairdata(parameters.ticker)
        }
        const sd = CIQ.Studies.addStudy(stx, studyType, inputs, outputs, parameters, panel);
        // Update extreme values if provided
        if (extremeInfo && sd) {
            const newExtremeValue = {
                indicator: indicatorKey,
                extremeOptimism: sd.parameters.studyOverBoughtValue,
                extremePessimism: sd.parameters.studyOverSoldValue
            };
            const extremeValueList = CIQ.store.$state.extremeValue || [];
            CIQ.store.set_extreme_value([...extremeValueList, newExtremeValue]);
        }
        // Add associated MAs
        for (const activatedMAObj of CIQ.store.$state.activatedMA) {
            if (
                activatedMAObj.url === indicatorKey && activatedMAObj.url !== '' &&
                (
                    indicatorKey !== 'ma' ||
                    (
                        activatedMAObj.index === parameters.index &&
                        activatedMAObj.criteria === parameters.criteria
                    )
                )
            ) {
                const ma_color = CIQ.store.getColorByCriteriaAndIndex(activatedMAObj.criteria, activatedMAObj.index);
                let maType = activatedMAObj.type;
                if (['SMA', 'EMA'].includes(maType)) {
                    maType = (maType === 'SMA' ? 'simple' : 'exponential');
                }
                CIQ.Studies.addStudy(stx, "ST MA", {
                    Type: maType,
                    Period: activatedMAObj.period,
                    display: "ST MA",
                    // 只有ma的附属stma是取默认收盘价为计算数据源
                    Field: activatedMAObj.url == 'ma' ? 'field' : activatedMAObj.url
                }, {
                    MA: ma_color
                }, {
                    criteria: activatedMAObj.criteria,
                    index: activatedMAObj.index
                });
            }
        }
    };
    

        // --- Phase 1: Categorize and Prepare Studies ---
        for (const indicatorName of indicatorList) {
            let indicatorObj = CIQ.findBuiltinTechIndicator(null, indicatorName) || CIQ.findSymbolIndicator(indicatorName, null);

            if (indicatorObj) {
                // It's a technical indicator (including MA-like)
                const techSymbolName = indicatorObj.value ? indicatorObj.value : indicatorObj.label;
                if (CIQ.store.$state.maLikeTech.includes(indicatorName)) {
                    // Handle MA-like technical indicators
                    for (const maLayoutItem of CIQ.store.$state.activatedMALayout) {
                        if (maLayoutItem.url === indicatorName) {
                            if(indicatorName == 'ma') {
                                const criteria = maLayoutItem.criteria;
                                const inputs = { Type: maLayoutItem.type, Field: maLayoutItem.field, Period: maLayoutItem.period };
                                const ma_color = CIQ.store.getColorByCriteriaAndIndex(criteria, maLayoutItem.index);
                                const outputs = { MA: ma_color };

                                studiesToLoad.push({
                                    type: indicatorName,
                                    inputs,
                                    outputs,
                                    parameters: { criteria: criteria, index: maLayoutItem.index },
                                    indicatorKey: indicatorName // Use indicatorName as the key for MA processing later
                                });
                            }
                            if(CIQ.findSymbolIndicator(indicatorName, null)) {
                                // const symbolLabel = indicatorName == 'Symbol Volume' ? '' : `(${getCoresSymbolDual(maLayoutItem.criteria.endsWith('2'))})`
                                const symbolLabel = ''
                                studiesToLoad.push({
                                    type: indicatorName,
                                    inputs: { display: `${symbolLabel}${maLayoutItem.ticker} ${indicatorName}` }, // Using placeholder for symbolLabel
                                    outputs: null,
                                    parameters: {  criteria: maLayoutItem.criteria, index: maLayoutItem.index, ticker: maLayoutItem.ticker },
                                    indicatorKey: indicatorName
                                });
                            }
                        }
                    }
                } else {
                    // Handle other technical indicators
                    // If not found in savedTechSD, use activatedTechLayout
                    const activatedTechLayouts = CIQ.store.$state.activatedTechLayout.filter(item => item.url === indicatorName);
                    const processedSymbols = new Set(); // To prevent duplicate studies for the same symbolType
                    for (let item of activatedTechLayouts) {
                        if (item.criteria && item.criteria.endsWith("2")) {
                            item.symbolType = 'symbol2';
                        } else {
                            item.symbolType = 'symbol1';
                        }

                        if (!processedSymbols.has(item.symbolType)) {
                            processedSymbols.add(item.symbolType);

                            // TODO, 把第一个判断，即saveTechSD加转移到这里
                            const isComparison = item.symbolType == 'symbol2'
                            const savedTechSD = CIQ.store.$state.savedTechSD.find(
                                sd => sd.type === indicatorName && sd.parameters.isComparison === isComparison
                            );
                            if (savedTechSD) {
                                const symbolLabel = getCoresSymbolDual(isComparison);
                                savedTechSD.inputs.display = `(${symbolLabel})${techSymbolName}`; // Using placeholder for symbolLabel
                                studiesToLoad.push({
                                    type: indicatorName,
                                    inputs: savedTechSD.inputs,
                                    outputs: savedTechSD.outputs,
                                    parameters: savedTechSD.parameters,
                                    panel: savedTechSD.panel,
                                    indicatorKey: indicatorName
                                });
                            }
                            else {
                                const criteria = item.criteria;
                                const symbolLabel = getCoresSymbolDual(criteria && criteria.endsWith('2'));
                                studiesToLoad.push({
                                    type: indicatorName,
                                    inputs: { display: `(${symbolLabel})${techSymbolName}` }, // Using placeholder for symbolLabel
                                    outputs: null,
                                    parameters: { isComparison: isComparison },
                                    indicatorKey: indicatorName
                                });
                            }
                        }
                    }
                }

                // Handle CIQ.store.$state.beforeCalculateNewConditions (logic moved here for clarity)
                if (CIQ.findSymbolIndicator(indicatorName, null)) {
                    CIQ.store.envoke_before_calculate_newConditions(!CIQ.store.$state.beforeCalculateNewConditions);
                }
            } else if (CIQ.isUserIndicator(indicatorName) || CIQ.isOwnIndicator(indicatorName)) {
                // It's a user-defined or "own" indicator, requires individual API call
                const indicatorBaseName = indicatorName.split(/(CREATE|HASH)/)[0];
                try {
                    const res = await searchIndicator(indicatorBaseName); // Assuming searchIndicator returns a Promise
                    const ownIndicatorInfo = res?.data?.results[0];

                    let newStudyDef = {
                        inputs: { Period: 13, Overlay: false },
                        outputs: {
                            [`${indicatorName}`]: senti_color[0], // Dynamic key
                            description: '',
                            url: indicatorName
                        },
                        parameters: {
                            init: {
                                studyOverZonesEnabled: true,
                                studyOverBoughtValue: ownIndicatorInfo ? Math.round(ownIndicatorInfo.lower_extreme_value * 1000) / 1000 : 999,
                                studyOverBoughtColor: process.env.VUE_APP_RED,
                                studyOverSoldValue: ownIndicatorInfo ? Math.round(ownIndicatorInfo.upper_extreme_value * 1000) / 1000 : -999,
                                studyOverSoldColor: process.env.VUE_APP_GREEN
                            }
                        },
                        attributes: {
                            studyOverBoughtValue: { "step": 0.001 },
                            studyOverSoldValue: { "step": 0.001 }
                        }
                    };

                    CIQ.Studies.studyLibrary[indicatorName] = newStudyDef;

                    const savedOwnSD = CIQ.store.$state.savedTechSD.find(sd => sd.type === indicatorName);
                    const displayInput = savedOwnSD ? savedOwnSD.inputs : { display: indicatorBaseName };
                    const parameters = savedOwnSD ? savedOwnSD.parameters : null;
                    const panel = savedOwnSD ? savedOwnSD.panel : null;

                    studiesToLoad.push({
                        type: indicatorName,
                        inputs: { ...displayInput, display: indicatorBaseName }, // Ensure display is updated
                        outputs: null, // Outputs are already in studyLibrary definition
                        parameters: parameters,
                        panel: panel,
                        indicatorKey: indicatorName,
                        extremeInfo: true // Indicate that extreme values need to be updated
                    });

                } catch (err) {
                    console.error(`Error fetching metadata for own indicator ${indicatorName}:`, err);
                }
            } 
            // else if (CIQ.isSymbolOHLCVIndicator(indicatorName)) {
            //     // It's a user-defined or "own" indicator, requires individual API call
            //     const indicatorTicker = indicatorName.split(/OHLCV/)[0];
            //     const indicatorOHLCV = indicatorName.split(/OHLCV/)[1];
            //     debugger
            //     // Handle other technical indicators
            //     const savedTechSDs = CIQ.store.$state.savedTechSD.filter(sd => sd.type === indicatorOHLCV);
            //     if (savedTechSDs.length > 0) {
            //         for (const savedSD of savedTechSDs) {
            //             const isComparison = savedSD.parameters.isComparison;
            //             const symbolLabel = getCoresSymbolDual(isComparison);
            //             savedSD.inputs.display = `(${symbolLabel})${indicatorTicker} ${indicatorOHLCV}`; // Using placeholder for symbolLabel
            //             studiesToLoad.push({
            //                 type: indicatorOHLCV,
            //                 inputs: savedSD.inputs,
            //                 outputs: savedSD.outputs,
            //                 parameters: savedSD.parameters,
            //                 panel: savedSD.panel,
            //                 indicatorKey: indicatorOHLCV
            //             });
            //         }
            //     } else {
            //         // If not found in savedTechSD, use activatedTechLayout
            //         const activatedTechLayouts = CIQ.store.$state.activatedTechLayout.filter(item => item.url === indicatorOHLCV);
            //         const processedSymbols = new Set(); // To prevent duplicate studies for the same symbolType
            //         for (let item of activatedTechLayouts) {
            //             if (item.criteria && item.criteria.endsWith("2")) {
            //                 item.symbolType = 'symbol2';
            //             } else {
            //                 item.symbolType = 'symbol1';
            //             }

            //             if (!processedSymbols.has(item.symbolType)) {
            //                 processedSymbols.add(item.symbolType);
            //                 const criteria = item.criteria;
            //                 const symbolLabel = getCoresSymbolDual(criteria && criteria.endsWith('2'));
            //                 // studiesToLoad.push({
            //                 //     type: indicatorOHLCV,
            //                 //     inputs: { display: `(${symbolLabel})${indicatorTicker} ${indicatorOHLCV}` }, // Using placeholder for symbolLabel
            //                 //     outputs: null,
            //                 //     parameters: { isComparison: item.symbolType === 'symbol2', ticker: indicatorTicker },
            //                 //     indicatorKey: indicatorOHLCV
            //                 // });
            //             }
            //         }
            //     }
            // } 
            else {
                // It's a sentiment indicator
                sentiUrlList.push(indicatorName);
            }
        }

        // --- Phase 2: Handle Sentiment Indicators (Batched API Call) ---
        if (sentiUrlList.length > 0) {
            const params = sentiUrlList.map((url, i) => `${i === 0 ? 'indicator' : `indicator_${i + 1}`}=${recoverSymbolOptixUrl(url)}`).join('&');
            const queryUrl = `${config.indicatorsMetadata}?${params}`;

            try {
                const res = await CIQ.axios.get(queryUrl);
                const newQuotes = res.data;

                for (let i in sentiUrlList) {
                    const sentiIndicator = sentiUrlList[i];
                    const sentiData = newQuotes[recoverSymbolOptixUrl(sentiIndicator)];

                    if (sentiData !== null) {
                        let newStudyDef = {
                            inputs: { Period: 13, Overlay: false },
                            outputs: {
                                [`${sentiIndicator}`]: senti_color[i % senti_color.length], // Use modulo for color cycling if more colors are added
                                description: sentiData.description,
                                url: sentiIndicator
                            },
                            parameters: {
                                init: {
                                    studyOverZonesEnabled: true,
                                    studyOverBoughtValue: sentiData.opt_extreme ? Math.round(sentiData.opt_extreme * 1000) / 1000 : NaN,
                                    studyOverBoughtColor: process.env.VUE_APP_RED,
                                    studyOverSoldValue: sentiData.pess_extreme ? Math.round(sentiData.pess_extreme * 1000) / 1000 : NaN,
                                    studyOverSoldColor: process.env.VUE_APP_GREEN
                                }
                            },
                            attributes: {
                                studyOverBoughtValue: { "step": 0.001 },
                                studyOverSoldValue: { "step": 0.001 }
                            }
                        };

                        CIQ.Studies.studyLibrary[sentiIndicator] = newStudyDef;

                        const sentiName = CIQ.findSentiIndicator(null, sentiIndicator)?.chart_name;
                        const savedSentiSD = CIQ.store.$state.savedTechSD.find(sd => sd.type === sentiIndicator);

                        const displayInput = savedSentiSD ? savedSentiSD.inputs : { display: sentiName };
                        const parameters = savedSentiSD ? savedSentiSD.parameters : null;
                        const panel = savedSentiSD ? savedSentiSD.panel : null;

                        studiesToLoad.push({
                            type: sentiIndicator,
                            inputs: { ...displayInput, display: sentiName }, // Ensure display is updated
                            outputs: null, // Outputs are already in studyLibrary definition
                            parameters: parameters,
                            panel: panel,
                            indicatorKey: sentiIndicator,
                            extremeInfo: true
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching sentiment indicator metadata:", err);
            }
        }

        // --- Phase 3: Add all prepared studies to the chart ---
        for (const study of studiesToLoad) {
            await addStudyToChart(study.type, study.inputs, study.outputs, study.parameters, study.panel, study.indicatorKey, study.extremeInfo);
        }

};
 }
 export {__st_js_loadIndicator_}
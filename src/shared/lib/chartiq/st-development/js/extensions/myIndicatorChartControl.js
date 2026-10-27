/**
 *	2.2.0
 *	contains customized functions related to indicator loading and CSV output file generation
 */
 import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
 import {config} from "../../examples/feeds/STDataFeedAccessUrl"
 import { uniqueObjectArray } from '../../../utils/formValidate'
 import {capitalizeFirstLetter} from '../../../utils'
 import { recoverSymbolOptixUrl,getCoresSymbolDual } from "../../../utils/globalFunc";
 import {
    getPairData
  } from '@/service/service'
  import SignalCode from '@/utils/cryptoUtils/codeTool'

 /** 独立出的myIndicator对于chartiq的控制函数，考虑到它并没有很依赖loadIndicator.js */

 let __st_js_myindicator_chart_control_ = (_exports) => {
 /* global _CIQ, _timezoneJS, _SplinePlotter */
 
 var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    // user's own indicator的 weight indicator加载函数单独设定
    //var symbol

    // 预览/编辑时高亮“正在创建的自定义指标”所在panel，与同图加载的内置指标区分。
    // loadChart 会重建全部panel，所以不能只在 addStudy 时打标记：由
    // IndicatorBuilderChartIQ 在图表就绪后挂 stx.append('drawPanels')，
    // 每次重绘按 __miOwnIndicatorHighlight 重新核对标记。
    CIQ.setMIOwnIndicatorHighlight = function(indicator){
        CIQ.__miOwnIndicatorHighlight = indicator || ''
    }
    CIQ.applyMIOwnIndicatorHighlight = function(){
        var stxx = CIQ.stxx
        if(!stxx || !stxx.panels) return
        var target = CIQ.__miOwnIndicatorHighlight || ''
        var highlightedPanels = {}
        if(target){
            for(var studyInstanceName in stxx.layout.studies){
                var sd = stxx.layout.studies[studyInstanceName]
                if(sd.type === target) highlightedPanels[sd.panel] = true
            }
        }
        for(var panelName in stxx.panels){
            var panel = stxx.panels[panelName]
            if(!panel || !panel.holder) continue
            panel.holder.classList.toggle('mi-custom-indicator-panel', !!highlightedPanels[panelName])
        }
    }

    CIQ.displayWeightOwnIndicator = async function(previousState,updatedState,combinedStudy){
        // combinedStudy 为 null 表示编辑中的实时刷新（此时组合指标已被移除）
        CIQ.setMIOwnIndicatorHighlight(combinedStudy)
        CIQ.addCover()
        CIQ.store.set_mi_create_loading(true)
        //编辑时对内容修改或者preview应该移除生成的indicator
        if(!combinedStudy){
            for (var studyInstanceName in CIQ.stxx.layout.studies) { 
                var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                if(CIQ.isOwnIndicator(sd.type)) CIQ.Studies.removeStudy(CIQ.stxx, sd); 
            }
        }


        // 提取indicator移除列表和新增列表,
        const { addedItems, removedItems } = findAddedAndRemovedItems(previousState, updatedState);
        
        // 防止symbol出现 [AA, AA]的情况，第二个为序列显示，但是会报错
        const indicatorList = uniqueObjectArray(updatedState.filter(item=> item.type=='Indicator'))
        const symbolList = uniqueObjectArray(updatedState.filter(item=> item.type=='Symbol'))

        // indicator移除
        for (var studyInstanceName in CIQ.stxx.layout.studies) {
            var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
            if (removedItems.find(item=>item.indicator_url==sd.type)){
                CIQ.Studies.removeStudy(CIQ.stxx, sd); 
            }
        }
        // indicator加载
        await addIndicatorStudy(addedItems.map(item=>item.indicator_url))

        const benchmark = CIQ.store.$state.miBenmark
        CIQ.stxx.loadChart({ 
            // 优先考虑symbolList第一个，然后是benchmark（edit时）, benchmark不存在就用默认
                symbol: symbolList.length?symbolList[0].indicator_url:benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL, 
                indicator:[...indicatorList.map(item=>item.indicator_url),combinedStudy] ,
                // 这边先写死范围，防止其他indicator无法pagination
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            },
            function () {
                // symbol加载，识别第一个为默认图标symbol,其它symbol作为serie加载,必须遍历加载，不然很难管理
                manageSymbolSerie(symbolList);
                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
            }
        ) 
        
    }

    // 同metaData
    const addIndicatorStudy = function(indicatorList){
        var color = ["#5B9BD1","#368DF0","#7257F2","#21CE6B","#24CBB7","#EC4D4E","#F4803D"]
   
        //let indicatorHeight = CIQ.setPanelHeight(indicatorList)
        // let indicatorHeight = 100
    
        let resArr = []
        let sentiUrlList = []
    
        return new Promise(resolve=>{
            for(var i in indicatorList){
               if(CIQ.isOwnIndicator(indicatorList[i])){
               /********************lishan modify end*************************/
                    var newStudy = {
                        inputs: { Period: 13, Overlay: false},
                        outputs: 
                        {indicatorClose:color[i%7],description: '',url:indicatorList[i]},
                        // panelHeight:indicatorHeight,
                        parameters: { init: {
                            studyOverZonesEnabled: true,
                            studyOverBoughtValue: 999,
                            studyOverBoughtColor: process.env.VUE_APP_RED,
                            studyOverSoldValue: 999,
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

                       /********************lishan modify start*************************/
                       var indicatorName = indicatorList[i].match(/(CREATE|HASH)/) ? indicatorList[i].split(/(CREATE|HASH)/)[0] : indicatorList[i]
                       /********************lishan modify end*************************/
                      CIQ.Studies.addStudy(CIQ.stxx,indicatorList[i],{display:indicatorName})   

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
                            {indicatorClose:color[i%7],description: newQuotes[i].description,url:sentiUrlList[i]},
                            // panelHeight:indicatorHeight,
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
                            let sentiName = CIQ.findSentiIndicator(null,sentiUrlList[i])?.chart_name
                            CIQ.Studies.addStudy(CIQ.stxx,sentiUrlList[i],{display:sentiName})    
                        
                    }
                }   
                resolve()                     
            }).catch(err => {
                
            })
        })
    
    }
    const manageSymbolSerie = function(symbolList){
        // 先清空series
        for(var s in CIQ.stxx.chart.series){
            var series=CIQ.stxx.chart.series[s];
            CIQ.stxx.removeSeries(series);
        }

        for(var i in symbolList){
            // 第一个symbol为默认图表symbol
            if(i>0){
                CIQ.stxx.addSeries(symbolList[i].indicator_url, {
                    display:symbolList[i].indicator, 
                    isComparison: false, 
                    color: "#368DF0",
                    permanent: true,
                    yAxis:{ 
                        position:"left",
                        textStyle:"#FFBE00"
                    },
                });
            }
        }
    }
    function findAddedAndRemovedItems(previousState, currentState) {
        const addedItems = currentState.filter(currentItem => 
          !previousState.some(previousItem => 
            JSON.stringify(previousItem) === JSON.stringify(currentItem)
          )
        ).filter(item=> item.type=='Indicator');
      
        const removedItems = previousState.filter(previousItem =>
          !currentState.some(currentItem =>
            JSON.stringify(currentItem) === JSON.stringify(previousItem)
          )
        ).filter(item=> item.type=='Indicator');
        return {
          addedItems,
          removedItems
        };
      }




    // 以下管理user's own indicator 图表函数
    CIQ.updateUserOwnIndicator = async function(newData,oldData){
        await new Promise((resolve) => {
            CIQ.addCover()
            CIQ.store.set_mi_create_loading(true)
            //编辑时对内容修改或者preview应该移除生成的indicator
            for (var studyInstanceName in CIQ.stxx.layout.studies) {
                var sd = CIQ.stxx.layout.studies[studyInstanceName];
                if(CIQ.isOwnIndicator(sd.type)) CIQ.Studies.removeStudy(CIQ.stxx, sd);
            }
            // 组合指标已随上面一并移除，等 preview 重新生成后再高亮
            CIQ.setMIOwnIndicatorHighlight('')

            if(oldData.categories != newData.categories){
                // 仅当大类切换（indicator->symbol->wic）才移除现存studies
                if(oldData.categories.split(' ')[0] != newData.categories.split(' ')[0]){
                    // remove existing studies and series
                    for (var studyInstanceName in CIQ.stxx.layout.studies) { 
                        var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                        CIQ.Studies.removeStudy(CIQ.stxx, sd); 
                    }
                    for(var s in CIQ.stxx.chart.series){
                        var series=CIQ.stxx.chart.series[s];
                        CIQ.stxx.removeSeries(series);
                    }
                }

                // 类型切换时设置默认timeframe(主要因为WIC,indicator,symbol会设置'form/getFrequency')
                CIQ.store.set_freqency('Daily')

                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
                resolve()
                return
            }
            
            if(newData.categories.includes('Symbol')){
                // 如果左侧发生变动
                if(oldData.indicator1.url != newData.indicator1.url){
                    CIQ.objIndicator = []


                }
                // 如果右侧发生变动
                if(oldData.indicator2.url != newData.indicator2.url){
                    CIQ.store.setComparisonSymbol({
                        name:newData.indicator2.name,
                        url:newData.indicator2.url,
                    })

                }

                // 移除上一个indicator2 symbol
                var series = CIQ.stxx.chart.series[oldData.indicator2.url];
                if(series) CIQ.stxx.removeSeries(series);
                CIQ.stxx.loadChart({
                    symbol: newData.indicator1.url || CIQ.stxx.chart.symbol,
                    startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),
                    endDate:new Date(),
                },()=>{
                    const miFormShift = CIQ.store.$state.miFormShift
                    // 当同时满足shift被勾选且symbol1存在并与symbol2一致，则计算偏移
                    const offset = (miFormShift.showInput && miFormShift.display) ? miFormShift.value : 0
                    if(newData.indicator2.name) loadSeries(newData.indicator2.name,newData.indicator2.url,offset)
                    else {
                        CIQ.hideCover()
                        CIQ.store.set_mi_create_loading(false)
                    }
                })
                resolve()
            }
            
            if(newData.categories.includes('Indicator')){
                // 2026-5月新特性，支持indicator shift,所以在切换左侧或右侧indicator前先移除ShiftedSentimentIndicator
                if(oldData.indicator1.url == oldData.indicator2.url) {
                    for (var studyInstanceName in CIQ.stxx.layout.studies) { 
                        var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                        if(sd.type == "ShiftedSentimentIndicator") CIQ.Studies.removeStudy(CIQ.stxx, sd); 
                    }
                }

                // 如果左indicator前后发生了改变
                if(oldData.indicator1.url != newData.indicator1.url){
                    // 如果操作前左右indicator不同，则移除左indicator（ [smart_money,aim]->[dumb_money,aim] ?  remove smart_money）
                    if(oldData.indicator1.url != oldData.indicator2.url) {
                        for (var studyInstanceName in CIQ.stxx.layout.studies) {
                            var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                            if (sd.type == oldData.indicator1.url){
                                CIQ.Studies.removeStudy(CIQ.stxx, sd); 
                            }
                        }
                    }
                    // 如果操作后另一个框存在了同样的indicator就刷新当前indicator后跳过加载（ [aim,smart_money]->[smart_money,smart_money]）
                    if(newData.indicator1.url == newData.indicator2.url) {
                        const miShift = CIQ.store.$state.miFormShift
                        CIQ.addIndicatorShift(newData.indicator1.name, newData.indicator1.url, miShift.value || 0)
                        resolve()
                    }else{
                        addSingleIndicator([newData.indicator1.url,newData.indicator2.url],newData.indicator1.url,null,null,()=>{resolve()});
                    }
                }
                // 如果右indicator前后发生了改变
                if(oldData.indicator2.url != newData.indicator2.url){
                    // 如果操作前左右indicator不同，则移除右indicator（ [aim,smart_money]->[aim,dumb_money] ?  remove smart_money）
                    if(oldData.indicator1.url != oldData.indicator2.url) {
                        for (var studyInstanceName in CIQ.stxx.layout.studies) {
                            var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                            if (sd.type== oldData.indicator2.url){
                                CIQ.Studies.removeStudy(CIQ.stxx, sd); 
                            }
                        }       
                    }
                    // 如果操作后另一个框存在了同样的indicator就加载shifted indicator（ [aim,smart_money]->[aim,aim] ? add shifted aim）
                    if(newData.indicator1.url == newData.indicator2.url) {
                        const miShift = CIQ.store.$state.miFormShift
                        CIQ.addIndicatorShift(newData.indicator2.name,newData.indicator2.url,miShift.value || 0)
                        resolve()
                    }else{
                        addSingleIndicator([newData.indicator1.url,newData.indicator2.url],newData.indicator2.url,null,null,()=>{resolve()});
                    }
                }
            }

            // finally,需要刷新一次，因为可能会修改timeframe
            if(
                (oldData.categories == newData.categories) &&
                (oldData.indicator1.url == newData.indicator1.url) &&
                (oldData.indicator2.url == newData.indicator2.url)
            ){
                CIQ.stxx.loadChart({
                    symbol: CIQ.stxx.chart.symbol,
                    startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),
                    endDate:new Date(),
                },()=>{
                    CIQ.hideCover()
                    CIQ.store.set_mi_create_loading(false)
                })
                resolve(); 
            }      
        })
    }

    const formatData = function(data,barOffset=0) {
        if(data == null){
            data = []
        }
        var newQuotes = [];
        if('High' in data[0]){
            for (var i = 0; i < data.length; i++) { 
                let shiftedIndex = i + barOffset; // 计算新的索引位置

                if (shiftedIndex >= 0 && shiftedIndex < data.length) { // 确保索引在范围内
                    newQuotes.push({
                        DT: new Date(new Date(data[shiftedIndex].DT).getTime() + new Date(data[shiftedIndex].DT).getTimezoneOffset() * 60 * 1000),
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
                        DT: new Date(new Date(data[shiftedIndex].DT).getTime() + new Date(data[shiftedIndex].DT).getTimezoneOffset() * 60 * 1000),
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

    const loadSeries = async function(name,url,barOffset,cb) {
        var start = config.timestampToTime(CIQ.initialDate.start)
        var end = config.timestampToTime(CIQ.initialDate.end)
        const res = await getPairData( start, end, CIQ.store.$state.pairDataFreq, url)
        let _data = formatData(res.data,barOffset)
        CIQ.stxx.addSeries(url, {
            display:`${name}${barOffset ? `(shift-${barOffset})` : ``}`, 
            data:_data,
            isComparison: false, 
            color: "#368DF0",
            permanent: true,
            //panel:url,
            // This setting is only applicable when using the primary y-axis and has no effect when using a renderer that has its own axis.
            yAxis:{ 
                position:"left",
                textStyle:"#FFBE00"
            },
            //shareYAxis: true
        },()=>{ 
            if(cb) cb() 
        });

        CIQ.hideCover()
        CIQ.store.set_mi_create_loading(false)
    }

    // 预览生成的新indicator
    CIQ.previewUserOwnIndicator = function(indicatorList,indicator,symbol,extremeLines,category){
                // indicator 即预览生成的自定义指标（name+CREATE+url）
                CIQ.setMIOwnIndicatorHighlight(indicator)
                //编辑时对内容修改或者preview应该移除生成的indicator
                for (var studyInstanceName in CIQ.stxx.layout.studies) { 
                    var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
                    if(CIQ.isOwnIndicator(sd.type)) CIQ.Studies.removeStudy(CIQ.stxx, sd); 

                    // 如果是resample, 把现存的indicator也清空
                    if(category == 'Resample') CIQ.Studies.removeStudy(CIQ.stxx, sd);
                }
        addSingleIndicator(indicatorList,indicator,symbol,extremeLines,()=>{
            // 但是需要判断symbol1与symbol2一致，不一致的话自然不会去计算偏移
            if(category?.includes('Symbol')) {
                const miFormShift = CIQ.store.$state.miFormShift
                // offset仅供显示
                const offset = (miFormShift.showInput && miFormShift.display) ? miFormShift.value : 0
                CIQ.addSymbolShift(offset)
            }
            // 处理Indicator类别的shift
            if(category?.includes('Indicator')) {
                const indicator1 = indicatorList[0]
                const indicator2 = indicatorList[1]
                if(indicator1 && indicator2 && indicator1 === indicator2) {
                    const miFormShift = CIQ.store.$state.miFormShift
                    const offset = (miFormShift.showInput && miFormShift.display) ? miFormShift.value : 0
                    CIQ.addIndicatorShift(indicator2, indicator2, offset)
                }
            }
        });
    }

    const extractValues = (str) => {
        const parts = str.split('|');

        const left = parts[0];  // sh5_c
        const right = parts[1]; // sh10_o

        const regex = /(\d+)_([a-zA-Z])/; // 修正的正则

        const leftMatch = left.match(regex); // 匹配左边部分
        const rightMatch = right.match(regex); // 匹配右边部分

        if (leftMatch && rightMatch) {
          return {
            shift_ma1: leftMatch[1] || '',   // 提取左侧数字部分
            symbol_ma1: leftMatch[2] || 'c', // 提取左侧字母部分
            shift_ma2: rightMatch[1] || '',  // 提取右侧数字部分
            symbol_ma2: rightMatch[2] || 'o' // 提取右侧字母部分
          };
        } else {
          return null; // 如果没有匹配到
        }
      };

    // 从列表进入后还原new indicator的设定和新的indicator
    // 我这里不用重新触发inputSelectHandler的思路来复现图表，因为这样会导致图表加载流程冗余
    CIQ.displayUserOwnIndicatorLayout = async function(_newVal){
        //考虑到addSeries必须在displaydata前设定好timeframe
        CIQ.store.set_freqency(_newVal.time_frame) //考虑到addSeries必须写死timeframe
        CIQ.addCover()
        CIQ.store.set_mi_create_loading(true)
        const newData = {
            categories : _newVal.categories,
            indicator1 : {name:_newVal.former,url:_newVal.indicator_1_url},
            indicator2 : {name:_newVal.latter,url:_newVal.indicator_2_url},
            url : _newVal.name+'CREATE'+_newVal.url,
            mul_indicator : _newVal.mul_indicator,
            weight_list: _newVal.weightData,
            ma: _newVal.ma,
            calculate: _newVal.calculate, //symbol ohlcv field(Open,High...)
            tech_code: _newVal.tech_code
        }
        // 进入编辑恢复时，newData.url 就是待还原的自定义指标
        CIQ.setMIOwnIndicatorHighlight(newData.url)
        const extremeLines = {op:_newVal.upper_extreme_value,ep:_newVal.lower_extreme_value}
           
        if(newData.categories == 'Symbol Spread' || newData.categories == 'Symbol Ratio' || newData.categories == 'Symbol Addition'){
                // indicator1,包括主symbol和new indicator
                CIQ.objIndicator = []
                CIQ.store.setComparisonSymbol({
                    name:newData.indicator2.name,
                    url:newData.indicator2.url,
                })
                
                CIQ.stxx.loadChart({
                    symbol: newData.indicator1.url, // indicator1和benchmark一致的
                    indicator:[newData.url],
                    startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
                }, ()=>{
                    // TODO
                    let offset = 0
                    if(newData.indicator1.url == newData.indicator2.url && _newVal.next_process) {
                        const result = extractValues(_newVal.next_process)
                        if(result !== null) {
                            offset = Number(result[`shift_ma2`]) || 0
                            // display form时还原shift值到vuex
                            CIQ.store.set_mi_form_shift({'display': true, 'showInput': !!offset, 'value':  offset})
                        }
                    }
                    loadSeries(newData.indicator2.name,newData.indicator2.url,offset,()=>{
                        displayOwnIndicatorMAStudies(newData)
                    })
                })

                // 如果展示时右框存在了同样的symbol就跳过加载（ [A,AAON]->[A,A] or [A,null]->[A,A]）
                // if(newData.indicator1.url != newData.indicator2.url) {
                //     //indicator2,即comparison symbol
                //     CIQ.stxx.addSeries(newData.indicator2.url, {
                //         display:newData.indicator2.name, 
                //         isComparison: false, 
                //         color: "#368DF0",
                //         permanent: true,
                //         //panel:newData.indicator2.url,
                //         // This setting is only applicable when using the primary y-axis and has no effect when using a renderer that has its own axis.
                //         yAxis:{ 
                //             position:"left",
                //             textStyle:"#FFBE00"
                //         },
                //         //shareYAxis: true
                //     });
                // }
                // displayOwnIndicatorMAStudies(newData)
                await getUserOwnIndicatorMatedata(newData.url,extremeLines)
        }
        
        if(newData.categories == 'Indicator Spread' || newData.categories == 'Indicator Ratio'|| newData.categories == 'Indicator Addition'){
            // indicator1
            await getUserOwnIndicatorMatedata(newData.indicator1.url,null)
            // indicator2
            if(newData.indicator1.url != newData.indicator2.url) {
                // 如果展示时右框存在了同样的indicator就跳过加载
                await getUserOwnIndicatorMatedata(newData.indicator2.url,null)
            }
            
            // 自定义indicator
            await getUserOwnIndicatorMatedata(newData.url,extremeLines)
            const benchmark = CIQ.store.$state.miBenmark
            CIQ.stxx.loadChart(	{ 
                symbol: benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL, 
                indicator:[newData.indicator1.url,newData.indicator2.url,newData.url],
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            }, function(){
                if(newData.indicator1.url == newData.indicator2.url) {
                    const miShift = CIQ.store.$state.miFormShift
                    // 只要是两个一样的就直接绘制ShiftedSentimentIndicator
                    CIQ.addIndicatorShift(newData.indicator2.name,newData.indicator2.url,miShift.value)
                }
                displayOwnIndicatorMAStudies(newData)
                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
            }) 
        }

        if(newData.categories == "Weighted Indicator Combination"){
            // WIC 列表加载
            // 自定义indicator
            await getUserOwnIndicatorMatedata(newData.url,extremeLines)
            CIQ.store.set_miFormWeightedListChange({data:newData.weight_list,url:newData.url})
        }

        CIQ.isOHLCVSelectedMI = false
        if(newData.categories == "OHLCV"){
            CIQ.isOHLCVSelectedMI = true
            // WIC 列表加载
            // 自定义indicator
            await getUserOwnIndicatorMatedata(newData.url,extremeLines)


            const benchmark = CIQ.store.$state.miBenmark
            CIQ.stxx.loadChart({
                symbol: newData.indicator1.url?newData.indicator1.url:benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL, 
                indicator:[newData.url],
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            }, function(){
                displayOwnIndicatorMAStudies(newData)
                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
            })
        }
        debugger
        if(newData.categories == "Resample") {
            // 自定义indicator
            await getUserOwnIndicatorMatedata(newData.url,extremeLines)

            const benchmark = CIQ.store.$state.miBenmark
            CIQ.stxx.loadChart({
                symbol: benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL, 
                indicator:[newData.url],
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            }, function(){
                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
            })
        }
        if(newData.categories == "Technical"){
            debugger
            const benchmark = CIQ.store.$state.miBenmark
            CIQ.stxx.loadChart({
                symbol: newData.indicator1.url?newData.indicator1.url:benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL, 
                indicator:[],
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            }, function(){
                // 可能tech list还没初始化，需要手动处理
                const signalCode = new SignalCode()
                console.log(newData.tech_code)
                let techIndicator
                try{
                    let techDecode = signalCode.decode(newData.tech_code)
                    // const getBuiltinList = CIQ.store.$state.builtinList
                    // const config = getCustomConfig()
                    // if(getBuiltinList.length == 0) await this.$store.dispatch('chart/initiate_tech_list', config.technicalClassCategory)
                    // techIndicator = CIQ.findBuiltinTechIndicator(techDecode.indicator,'')
                    techIndicator = CIQ.findBuiltinTechIndicator(techDecode.indicator,'')
                }catch(err){}
                CIQ.Studies.addStudy(CIQ.stxx, techIndicator.url, {
                }, null,{ 
                    criteria: 'entry1', 
                    index: 0 
                }) 

                CIQ.hideCover()
                CIQ.store.set_mi_create_loading(false)
            })
        }
        // WIC也需要初始化miFormState,主要是用到设定category
        // 【照搬原版】旧版此处是 commit('chart/miFormStateChange')（仅写 state），
        // 不能调用 set_miFormStateChange action —— 那会走 updateUserOwnIndicator，
        // 把 indicator1/indicator2 当作“已变更”再 addSingleIndicator 一次，导致 study 重复
        CIQ.store.set_mi_form_state({
            categories: newData.categories,
            indicator_1: newData.indicator1.name,
            indicator_2: newData.indicator2.name,
            indicator_1_url: newData.indicator1.url,
            indicator_2_url: newData.indicator2.url,
        })
    }

    // 展示还原study附属的ma
    const displayOwnIndicatorMAStudies = function(newData){
        if(newData.categories == 'OHLCV'){
            const ma_type = newData.ma.includes('e') ? 'EMA' : 'MA'
            const ma_value = newData.ma.includes('e') ? newData.ma.split('e')[0] : newData.ma
            const ma_showInput = ma_value != '0'

            CIQ.addOwnIndicatorMAStudy(
                ma_value,
                ma_type,
                capitalizeFirstLetter(newData.calculate),
                'entry1',
                0,
                ma_showInput,
                newData.categories
            )  
        }else {
            // e.g. 12_30roc_1
            let parts = newData.ma.split('_')
            // 解析类型和数值
            const getTypeAndValue = (val) => {
                const numMatch = val.match(/^\d+/); // 提取开头的数字
                const typeMatch = val.replace(/^\d+/, ""); // 去掉开头数字，获取类型部分

                let type = "unknown";
                if (!typeMatch) type = "MA"; // 如果仅是数字，则为 ma
                else if (/e/i.test(typeMatch)) type = "EMA";
                else if (/roc/i.test(typeMatch)) type = "roc";
                else if (/amplify/i.test(typeMatch)) type = "amplify";
                else if (/amplitude/i.test(typeMatch)) type = "amplitude";

                return { type, value: numMatch ? numMatch[0] : null };
            };
            const ma1_type = getTypeAndValue(parts[0]).type;
            const ma1_value = getTypeAndValue(parts[0]).value;
            const ma1_showInput = ma1_value != '0'
            const ma2_type = getTypeAndValue(parts[1]).type;
            const ma2_value = getTypeAndValue(parts[1]).value;
            const ma2_showInput = ma2_value != '0'

            let fieldName1 = 'field',fieldName2 = 'field'
            if(newData.categories.includes('Symbol')){ // symbol
            }else{        
                fieldName1 = newData.indicator1.url
                fieldName2 = newData.indicator2.url
            }
        
            if(['EMA','MA'].includes(ma1_type)){
                // ma1
                CIQ.addOwnIndicatorMAStudy(
                    ma1_value,
                    ma1_type,
                    fieldName1,
                    'entry1',
                    0,
                    ma1_showInput,
                    newData.categories
                )
            } else if(ma1_type == 'roc') {
                // 这边field不能用‘field’会导致没法判断为symbolohlcv，考虑到只有收盘价算roc，直接hard coding
                CIQ.addOwnIndicatorROCStudy(
                    ma1_value,
                    'Close',
                    'entry1',
                    0,
                    ma1_showInput,
                ) 
            } else if(ma1_type == 'amplitude' || ma1_type == 'amplify') {
                CIQ.addOwnIndicatorAmplitudeStudy(
                    'entry1',
                    0,
                    ma1_showInput,
                ) 
            }

            if(['EMA','MA'].includes(ma2_type)){
                // ma2
                // display shift indicator ma
                const showShiftInput = (newData.indicator1.url !== '' && newData.indicator2.url !== '') && newData.indicator1.url === newData.indicator2.url
                if(newData.categories && newData.categories.includes('Indicator') && showShiftInput) {
                    const shiftedStudy = Object.values(CIQ.stxx.layout.studies)
                        .find(s => s.type === 'ShiftedSentimentIndicator');
                    if(shiftedStudy && shiftedStudy.inputs) {
                        fieldName2=shiftedStudy.inputs.display
                    }
                } 
                CIQ.addOwnIndicatorMAStudy(
                    ma2_value,
                    ma2_type,
                    // 如果是indicator则field为indicator_url，如果是symbol则main panel
                    fieldName2,
                    // 不是symbol類型的話，不用關心雙股票條件，默認爲entry1
                    newData.categories.includes('Symbol') ? 'entry2' : 'entry1',
                    1,
                    ma2_showInput,
                    newData.categories
                )
            } else if(ma2_type == 'roc') {
                // 这边field不能用‘field’会导致没法判断为symbolohlcv，考虑到只有收盘价算roc，直接hard coding
                CIQ.addOwnIndicatorROCStudy(
                    ma2_value,
                    'Close',
                    newData.categories.includes('Symbol') ? 'entry2' : 'entry1',
                    1,
                    ma2_showInput,
                ) 
            } else if(ma2_type == 'amplitude' || ma2_type == 'amplify') {
                CIQ.addOwnIndicatorAmplitudeStudy(
                    newData.categories.includes('Symbol') ? 'entry2' : 'entry1',
                    1,
                    ma2_showInput,
                ) 
            }
        }

    }

    // 第一个参数是默认值为SPX的symbol，own indicator quotefeed请求时为默认symbol，own symbol quotefeed请求时为表单第一个symbol
    // 第2个参数是给quotefeed请求提供的indicator列表，
    // 第3个是要加载的当前indicator
    const addSingleIndicator = async function(indicatorList,indicator,symbol,extremeLines,callback){
        // remove redundant elements and empty string
        for(var i=0;i<indicatorList.length;i++){
        if(indicatorList[i]=='' || indicatorList[i]==undefined){
            indicatorList.splice(i,1)
            i--;
        }
        }
        // fetch indicator information and add studies to chart
        await getUserOwnIndicatorMatedata(indicator,extremeLines)
        CIQ.stxx.loadChart(	{ 
            symbol: symbol?symbol:CIQ.stxx.chart.symbol, 
            indicator:indicatorList,
            startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
        },()=>{
            if(callback) callback()
            CIQ.hideCover()
            CIQ.store.set_mi_create_loading(false)
        }) 
    }
    const getUserOwnIndicatorMatedata = async function(indicator,extremeLines){
        var color = "#000000"
        return new Promise(resolve=>{
                if(CIQ.isOwnIndicator(indicator)){
                /********************lishan modify end*************************/
                    var newStudy = {
                        inputs: { Period: 13, Overlay: false},
                        outputs: 
                        {indicatorClose:color,description: '',url:indicator},
                        parameters: { init: {
                            studyOverZonesEnabled: true,
                            studyOverBoughtValue: extremeLines?Math.round(extremeLines.op*1000)/1000:NaN,
                            studyOverBoughtColor: process.env.VUE_APP_RED,
                            studyOverSoldValue: extremeLines?Math.round(extremeLines.ep*1000)/1000:NaN,
                            studyOverSoldColor: process.env.VUE_APP_GREEN
                        }},
                        attributes:{
                            studyOverBoughtValue:{"step":0.001},
                            studyOverSoldValue:{"step":0.001}
                        }
                    }
                    
                    var str = JSON.stringify(newStudy);                                   
                    str = str.replace(/indicatorClose/g, indicator);
                    newStudy = JSON.parse(str)                                     
                    
                    CIQ.Studies.studyLibrary[indicator] = newStudy

                    /********************lishan modify start*************************/
                    var indicatorName = indicator.match(/(CREATE|HASH)/) ? indicator.split(/(CREATE|HASH)/)[0] : indicator
                    /********************lishan modify end*************************/
                    CIQ.Studies.addStudy(CIQ.stxx,indicator,{display:indicatorName}) 
                    resolve()   
                }else{
                    var queryUrl =  config.indicatorMetadata + 
                    "?indicator=" + recoverSymbolOptixUrl(indicator);
                    let _res = new Promise((resolve,reject)=>{ 
                        CIQ.axios.get(
                            queryUrl,
                        ).then(res=>{
                            resolve(res.data)
                        }).catch(err=>{
                            reject(err)
                        })
                    })
                    _res.then(res => {
                        var newQuotes = res;
                            if (newQuotes !== null){
                                var newStudy = {
                                    inputs: { Period: 13, Overlay: false},
                                    outputs: 
                                    {indicatorClose:color,description: newQuotes.description,url:indicator},
                                    parameters: { init: {
                                        studyOverZonesEnabled: true,
                                        studyOverBoughtValue: newQuotes.opt_extreme?Math.round(newQuotes.opt_extreme*1000)/1000:NaN,
                                        studyOverBoughtColor: process.env.VUE_APP_RED,
                                        studyOverSoldValue: newQuotes.pess_extreme?Math.round(newQuotes.pess_extreme*1000)/1000:NaN,
                                        studyOverSoldColor: process.env.VUE_APP_GREEN
                                    }},
                                    attributes:{
                                        studyOverBoughtValue:{"step":0.001},
                                        studyOverSoldValue:{"step":0.001}
                                    }
                                }
                                
                                    var str = JSON.stringify(newStudy);                                   
                                    str = str.replace(/indicatorClose/g, indicator);
                                    newStudy = JSON.parse(str)                                     
                                    
                                    CIQ.Studies.studyLibrary[indicator] = newStudy
                                    let sentiName = CIQ.findSentiIndicator(null,indicator)?.chart_name
                                    CIQ.Studies.addStudy(CIQ.stxx,indicator,{display:sentiName})                
                            }
  
                        resolve()                     
                    }).catch(err => {
                        
                    })

                }
        })

    }

    CIQ.addOwnIndicatorMAStudy = function(value,type,field,criteria,index,showInput,categories) {
        if(!value) return
        const ma_color = CIQ.store.getColorByCriteriaAndIndex(criteria, 0)
        if(categories.includes('Indicator')){
            // 更新ma前移除当前index的旧ma
            for (var studyInstanceName in CIQ.stxx.layout?.studies) {
                let sd = CIQ.stxx.layout.studies[studyInstanceName]
                if (
                    ['ma','ST MA','ST ROCLike','Amplitude','Amplify'].includes(sd.type)
                    && sd.parameters.index == index
                ) {
                // 直接判断是否为st ma
                CIQ.Studies.removeStudy(
                    CIQ.stxx,
                    sd
                )
                }
            }
            // 现在逻辑改了，symbol2的均线也直接绘制在main panel上，视作exit2(因为是symbol2的退场)
            if(!showInput || !field) return
            CIQ.Studies.addStudy(CIQ.stxx, 'ST MA', {
                    Type: type == 'MA' ? 'simple' : 'exponential',
                    Period: value,
                    display: 'ST MA', //无需显示
                    Field: field
                },
                { MA: ma_color },
                { criteria: criteria, index: index },
            )
        }else { // symbol
            // 更新ma前移除当前index的旧ma
            for (var studyInstanceName in CIQ.stxx.layout?.studies) {
                let sd = CIQ.stxx.layout.studies[studyInstanceName]
                if (
                    ['ma','ST MA','ST ROCLike','Amplitude','Amplify'].includes(sd.type)
                    && sd.parameters.index == index
                ) {
                // 直接判断是否为st ma
                CIQ.Studies.removeStudy(
                    CIQ.stxx,
                    sd
                )
                }
            }

            // 现在逻辑改了，symbol2的均线也直接绘制在main panel上，视作exit2(因为是symbol2的退场)
            if(!showInput || !field) return

            CIQ.Studies.addStudy(CIQ.stxx, 'ma', {
                    Type: type == 'MA' ? 'simple' : 'exponential',
                    Field: field,
                    Period: value,
                }, 
                { MA: ma_color },
                { criteria: criteria, index: index },
            ) 
        }

    }
    CIQ.editOwnIndicatorExtremeLines = function(value,field){
        for (var studyInstanceName in CIQ.stxx.layout.studies) {
            var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
            if (CIQ.isOwnIndicator(sd.type)){
                var parameters = sd.parameters
                if(field == 'extreme_optimism'){
                    parameters.studyOverBoughtValue = value
                }else{
                    parameters.studyOverSoldValue = value
                }
                CIQ.Studies.replaceStudy(CIQ.stxx, sd.inputs.id, sd.type, sd.inputs, sd.outputs, parameters);
            }
        }
    }

    CIQ.changeUserOwnIndicatorSymbol = function(data){
        CIQ.addCover()
        CIQ.store.set_mi_create_loading(true)
        //编辑时对内容修改或者preview应该移除生成的indicator

        for (var studyInstanceName in CIQ.stxx.layout.studies) {
            var sd = CIQ.stxx.layout.studies[studyInstanceName];
            if(CIQ.isOwnIndicator(sd.type)) CIQ.Studies.removeStudy(CIQ.stxx, sd);
        }
        CIQ.setMIOwnIndicatorHighlight('')

        const benchmark = CIQ.store.$state.miBenmark
        CIQ.stxx.loadChart({
            symbol: data.symbol?data.symbol:benchmark?benchmark:process.env.VUE_APP_DEFAULT_SYMBOL,
            startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
        }, function(){
            CIQ.hideCover()
            CIQ.store.set_mi_create_loading(false)
        })
    }

    CIQ.addOwnIndicatorROCStudy = function(value,field,criteria,index,showInput) {
        if(!value) return
        // 更新ma前移除当前index的旧ma
        for (var studyInstanceName in CIQ.stxx.layout?.studies) {
            let sd = CIQ.stxx.layout.studies[studyInstanceName]
            if (
                sd.parameters.index == index
            ) {
            // 直接判断是否为st ma
            CIQ.Studies.removeStudy(
                CIQ.stxx,
                sd
            )
            }
        }

        // 现在逻辑改了，symbol2的均线也直接绘制在main panel上，视作exit2(因为是symbol2的退场)

        if(!showInput || !field) return
        const symbolLabel = getCoresSymbolDual(criteria.endsWith(2))
        let display = `(${symbolLabel}) Symbol Close Rate Of Change(${value}-Bar)`
        // 这里必须在计算函数调用之前就设好display name,因为后续会根据display name判断是不是shift以及它的值。我没有新增属性存shift在sd主要是防止兼容问题
        const miShift = CIQ.store.$state.miFormShift
        if(!criteria.endsWith('2')) {
		}
        else if(miShift.showInput && miShift.display) display = `${display}(shift-${miShift.value || 0})`
        // myindicator情况下显示带空格的display以区分左侧的ma
        else if(!(miShift.showInput && miShift.display)) display = `${display}`

        CIQ.setMALayout('Symbol Close', criteria, index, {ticker: symbolLabel})
        CIQ.Studies.addStudy(CIQ.stxx, 'ST ROCLike', {
            display: display,
            Field: field,
            condition: 'ROC',
            period: value,
        }, null,{ 
            criteria: criteria, 
            index: index 
        }) 
    }

    CIQ.addOwnIndicatorAmplitudeStudy = function(criteria,index,showInput) {
        // 更新ma前移除当前index的旧ma
        for (var studyInstanceName in CIQ.stxx.layout?.studies) {
            let sd = CIQ.stxx.layout.studies[studyInstanceName]
            if (
                sd.parameters.index == index
            ) {
            // 直接判断是否为st ma
            CIQ.Studies.removeStudy(
                CIQ.stxx,
                sd
            )
            }
        }

        // 现在逻辑改了，symbol2的均线也直接绘制在main panel上，视作exit2(因为是symbol2的退场)

        if(!showInput) return

        CIQ.Studies.addStudy(CIQ.stxx, 'Amplitude', {
        }, null,{ 
            criteria: criteria, 
            index: index 
        }) 
    }

    CIQ.addSymbolShift = function(value) {
        var comparisonSymbol = CIQ.store.$state.comparisonSymbol
        if(comparisonSymbol.url) {
            // 刷新当前symbol序列
            var series = CIQ.stxx.chart.series[comparisonSymbol.url];
            
            if(series) CIQ.stxx.removeSeries(series);

            loadSeries(comparisonSymbol.name,comparisonSymbol.url,value)
        }
    }

    CIQ.addIndicatorShift = function(name,url,shift) {
        // 移除 if(shift <= 0) 判断， 始终添加/刷新 ShiftedSentimentIndicator
        // if(shift <= 0) {
        //     CIQ.hideCover()
        //     CIQ.store.set_mi_create_loading(false)
        //     return
        // }

        // 刷新当前IndicatorShift
        for (var studyInstanceName in CIQ.stxx.layout.studies) { 
            var sd = CIQ.stxx.layout.studies[studyInstanceName]; 
            if(sd.type == "ShiftedSentimentIndicator") CIQ.Studies.removeStudy(CIQ.stxx, sd); 
        }

        CIQ.Studies.addStudy(CIQ.stxx, 'ShiftedSentimentIndicator', {
            display: `${name}${shift > 0 ? `(shift-${shift})` : ''}`,
            Field: url,
            shift: shift
        }, null) 
        CIQ.hideCover()
        CIQ.store.set_mi_create_loading(false)
    }

    CIQ.addSymbolOHLCVStudy = function(criteria,index) {
        // 只是移除对应位置的study
        for (var studyInstanceName in CIQ.stxx.layout?.studies) {
            let sd = CIQ.stxx.layout.studies[studyInstanceName]
            if (
                sd.parameters.index == index
            ) {
            // 直接判断是否为st ma
            CIQ.Studies.removeStudy(
                CIQ.stxx,
                sd
            )
            }
        }
    }

    CIQ.changeUserOwnIndicatorResample = function(indicator){
        //考虑到addSeries必须在displaydata前设定好timeframe
        CIQ.store.set_freqency(indicator.updated) //考虑到addSeries必须写死timeframe
        CIQ.addCover()
        CIQ.store.set_mi_create_loading(true)
        //编辑时对内容修改或者preview应该移除生成的indicator

        for (var studyInstanceName in CIQ.stxx.layout.studies) {
            var sd = CIQ.stxx.layout.studies[studyInstanceName];
            CIQ.Studies.removeStudy(CIQ.stxx, sd);
            // if(CIQ.isOwnIndicator(sd.type) || sd.type != indicator.url) CIQ.Studies.removeStudy(CIQ.stxx, sd);
        }
        CIQ.setMIOwnIndicatorHighlight('')

        addSingleIndicator([indicator.url],indicator.url,null,null,()=>{});
    }
    //utils
 }
 export {__st_js_myindicator_chart_control_}
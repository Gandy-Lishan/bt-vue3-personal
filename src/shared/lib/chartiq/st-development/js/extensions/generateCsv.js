import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
import cloneDeep from 'lodash/cloneDeep'

let __st_js_generateCsv_ = (_exports) => {
 /* global _CIQ, _timezoneJS, _SplinePlotter */
 var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

 let labelOption = new Array(10).fill('')
 
 // csv output file generation function
 CIQ.exportEx = function(){  
     let finalData = []
     
     let study = CIQ.stxx.layout.studies[Object.keys(CIQ.stxx.layout.studies).pop()]
     if(study == undefined){ return }
     // 因为scrubbed不包含没数据的row
     let JSONData = study.chart.dataSet
     let timePeriod = CIQ.store.getters.getSpanPeriod
     //先转化json
     let _arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
     // 根据time period筛选数据
     let arrData = []
     for(var i in _arrData){
         let item = _arrData[i]
         let dateNum = item.Date?item.Date:''
         if(timePeriod){
             if(dateNum<adjustStartDateToLastYear(timePeriod.start_date) || dateNum>timePeriod.end_date){continue}
         }
         // open 再赋值之前筛除无Close的row
         if(!item.Close){
             continue
         }
         arrData.push(_arrData[i])
     }

     const tradePriceType = CIQ.store.state.form.tradePrice
     // 给数组内容换好位置
     for(var i in arrData){
         let item = arrData[i]
         let dateNum = item.Date?item.Date:''
         let date = dateNum.slice(0,4)+ '-' + dateNum.slice(4,6)+ '-' + dateNum.slice(6,8)
 
         let obj = {
             Date: date,
             Open: (tradePriceType==1 || tradePriceType==2)? item.Close : item.Open,
             High: item.High,
             Low: item.Low,
             Close: item.Close ? item.Close : '',
             Volume: item.Volume ? item.Volume: 1,
             entry_1: '',
             entry_2: '',
             entry_3: '',
             entry_4: '',
             entry_5: '',
             exit_1: '',
             exit_2: '',
             exit_3: '',
             exit_4: '',
             exit_5: '',
             //Result: item[Object.keys(item)[8]],     
         };
       finalData.push(obj);
     }
 
     if(tradePriceType==2){
         finalData = finalData.map((item, index, arr) => {
             const newIndex = (index - 1) % arr.length; // 计算新的索引位置
             const newOpen = index === 0 ? arr[index].Open : arr[newIndex].Open; // 如果是第一个元素，设置year为null，否则获取下一个元素的year值
             return {
                 ...item,
                 Open: newOpen
             };
         });
     }
     // find the correspond sd type
     CIQ.store.state.chart.indicators.formIndicators.entry.forEach((value,index)=>{
         var _index = ''
         var indexNum
         var sd = {}
         for(var i in CIQ.stxx.layout.studies){
             var _sd = CIQ.stxx.layout.studies[i]
             // 如果indicator不是ma (那就是senti,own,users,其他tech'),则不考虑criteria和index
             // if(!_sd.parameters.criteria && _sd.type == value){
            if( 
                !_sd.parameters.criteria && 
                _sd.type == value && 
                // 如果_sd.parameters.isComparison,own,users, 不需判断_sd.parameters.isComparison
                (!_sd.parameters.hasOwnProperty('isComparison') || !_sd.parameters.isComparison)
            ){
                _index = 'entry_'+(index+1)
                indexNum = index
                sd = _sd
                continue;
            }
            if( 
                _sd.type == value &&
                _sd.parameters.criteria == 'entry' &&
                _sd.parameters.index == index
            ){
                _index = 'entry_'+(index+1)
                indexNum = index
                sd = _sd
            }
         }
         finalData = generateFinalOutput(arrData,finalData,sd,_index,indexNum,'entry')
     })
     CIQ.store.state.chart.indicators.formIndicators.exit.forEach((value,index)=>{
         var _index = ''
         var indexNum
         var sd = {}
         for(var i in CIQ.stxx.layout.studies){
             var _sd = CIQ.stxx.layout.studies[i]
             // 如果indicator不是ma (那就是senti,own,users,其他tech'),则不考虑criteria和index如果indicator不是tech,symbolOHLCV (那就是senti,own,users'),则不考虑criteria和index
             // if(!_sd.parameters.criteria && _sd.type == value){
            if( 
                !_sd.parameters.criteria && 
                _sd.type == value && 
                // 如果_sd.parameters.isComparison,own,users, 不需判断_sd.parameters.isComparison
                (!_sd.parameters.hasOwnProperty('isComparison') || !_sd.parameters.isComparison)
            ){
                 _index = 'exit_'+(index+1)
                 indexNum = index
                 sd = _sd
                 continue;
            }
            // tech(including ma,st ma) ,roc, symbolOHLCV
            if( 
                _sd.type == value &&
                _sd.parameters.criteria == 'exit' &&
                _sd.parameters.index == index
            ){
                _index = 'exit_'+(index+1)
                indexNum = index
                sd = _sd
            }
         }
         finalData = generateFinalOutput(arrData,finalData,sd,_index,indexNum,'exit')
     })
     
     // generate a csv copy of finalData 
     let csvArray = []
     let indexs = Object.keys(finalData[0])
     let newIndexs = indexs.map((val,index)=>{
         if(index>=6 && index<=10){
             if(CIQ.store.state.chart.indicators.formIndicators.entry[index-6]){
                 return CIQ.store.state.chart.indicators.formIndicators.entry[index-6] + labelOption[index-6]
             }else{
                 return Object.keys(finalData[0])[index]
             }  
         }else if(index>10){
             if(CIQ.store.state.chart.indicators.formIndicators.exit[index-11]){
                 return CIQ.store.state.chart.indicators.formIndicators.exit[index-11] + labelOption[index-6]
             }else{
                 return Object.keys(finalData[0])[index]
             }  
         }else{
             return Object.keys(finalData[0])[index]
         }
     })
 
     csvArray.push(newIndexs)
 
 
     for (let i = 0; i < finalData.length; i++) {
     csvArray.push(Object.values(finalData[i]))
     }
     // 停用ohlcv截断
    //  csvArray = dropOHLCV(csvArray)
     if(CIQ.downloadCSV){
         downloadCSV(csvArray)
     }
     let csvContent = csvArray.map(e => e.join(",")).join("\n");
     return csvContent 
 };
 CIQ.exportEx2 = function(symbol){  
    let finalData = []
    
    let study = CIQ.stxx.layout.studies[Object.keys(CIQ.stxx.layout.studies).pop()]
    if(study == undefined){ return }
    // 因为scrubbed不包含没数据的row
    let JSONData = study.chart.dataSet
    let timePeriod = CIQ.store.getters.getSpanPeriod
    //先转化json
    let _arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    // 根据time period筛选数据
    let arrData = []
    for(var i in _arrData){
        let item = _arrData[i]

        // open 再赋值之前筛除无symbol2的row
        if(!item[symbol]){
            continue
        }else{
            let dateNum = item[symbol].Date?item[symbol].Date:''
            if(timePeriod){
                if(dateNum<adjustStartDateToLastYear(timePeriod.start_date) || dateNum>timePeriod.end_date){continue}
            }
        }
        arrData.push(_arrData[i])
    }

    const tradePriceType = CIQ.store.state.form.tradePrice
    // 给数组内容换好位置
    for(var i in arrData){
        let item = arrData[i]
        let symbol2Ohlcv = item[symbol]
        let dateNum = symbol2Ohlcv.Date?symbol2Ohlcv.Date:''
        let date = dateNum.slice(0,4)+ '-' + dateNum.slice(4,6)+ '-' + dateNum.slice(6,8)
        
        let obj = {
            Date: date,
            Open: (tradePriceType==1 || tradePriceType==2)? symbol2Ohlcv.Close: symbol2Ohlcv.Open,
            High: symbol2Ohlcv.High,
            Low: symbol2Ohlcv.Low,
            Close: symbol2Ohlcv?symbol2Ohlcv.Close:'',
            Volume: symbol2Ohlcv.Volume ? symbol2Ohlcv.Volume: 1,
            entry_1: '',
            entry_2: '',
            entry_3: '',
            entry_4: '',
            entry_5: '',
            exit_1: '',
            exit_2: '',
            exit_3: '',
            exit_4: '',
            exit_5: '',
            //Result: item[Object.keys(item)[8]],     
        };
      finalData.push(obj);
    }

    if(tradePriceType==2){
        finalData = finalData.map((item, index, arr) => {
            const newIndex = (index - 1) % arr.length; // 计算新的索引位置
            const newOpen = index === 0 ? arr[index].Open : arr[newIndex].Open; // 如果是第一个元素，设置year为null，否则获取下一个元素的year值
            return {
                ...item,
                Open: newOpen
            };
        });
    }
    
    // find the correspond sd type
    CIQ.store.state.chart.indicators.formIndicators.entry2.forEach((value,index)=>{
        var _index = ''
        var indexNum
        var sd = {}
        for(var i in CIQ.stxx.layout.studies){
            var _sd = CIQ.stxx.layout.studies[i]
            // 如果indicator不是ma (那就是senti,own,users,其他tech'),则不考虑criteria和index
             // if(!_sd.parameters.criteria && _sd.type == value){
            if( 
                !_sd.parameters.criteria && 
                _sd.type == value && 
                // 如果_sd.parameters.isComparison,own,users, 不需判断_sd.parameters.isComparison
                (!_sd.parameters.hasOwnProperty('isComparison') || _sd.parameters.isComparison)
            ){
                _index = 'entry_'+(index+1)
                indexNum = index
                sd = _sd
                continue;
            }
            if(
                _sd.type == value && 
                _sd.parameters.criteria == 'entry2' && 
                _sd.parameters.index == index
            ){
                _index = 'entry_'+(index+1)
                indexNum = index
                sd = _sd
            }
        }
        finalData = generateFinalOutput(arrData,finalData,sd,_index,indexNum,'entry2')
    })
    CIQ.store.state.chart.indicators.formIndicators.exit2.forEach((value,index)=>{
        var _index = ''
        var indexNum
        var sd = {}
        for(var i in CIQ.stxx.layout.studies){
            var _sd = CIQ.stxx.layout.studies[i]
            // 如果indicator不是tech,symbolOHLCV (那就是senti,own,users'),则不考虑criteria和index
            // if(!_sd.parameters.criteria && _sd.type == value){
            if( 
                !_sd.parameters.criteria && 
                _sd.type == value && 
                // 如果_sd.parameters.isComparison,own,users, 不需判断_sd.parameters.isComparison
                (!_sd.parameters.hasOwnProperty('isComparison') || _sd.parameters.isComparison)
            ){
                _index = 'exit_'+(index+1)
                indexNum = index
                sd = _sd
                continue;
            }
            if(
                _sd.type == value && 
                _sd.parameters.criteria == 'exit2' && 
                _sd.parameters.index == index
            ){
                _index = 'exit_'+(index+1)
                indexNum = index
                sd = _sd
            }
        }
        finalData = generateFinalOutput(arrData,finalData,sd,_index,indexNum,'exit2')
    })
    
    // generate a csv copy of finalData 
    let csvArray = []
    let indexs = Object.keys(finalData[0])
    let newIndexs = indexs.map((val,index)=>{
        if(index>=6 && index<=10){
            if(CIQ.store.state.chart.indicators.formIndicators.entry2[index-6]){
                return CIQ.store.state.chart.indicators.formIndicators.entry2[index-6] + labelOption[index-6]
            }else{
                return Object.keys(finalData[0])[index]
            }  
        }else if(index>10){
            if(CIQ.store.state.chart.indicators.formIndicators.exit2[index-11]){
                return CIQ.store.state.chart.indicators.formIndicators.exit2[index-11] + labelOption[index-6]
            }else{
                return Object.keys(finalData[0])[index]
            }  
        }else{
            return Object.keys(finalData[0])[index]
        }
    })

    csvArray.push(newIndexs)


    for (let i = 0; i < finalData.length; i++) {
    csvArray.push(Object.values(finalData[i]))
    }
    // 停用ohlcv截断
   //  csvArray = dropOHLCV(csvArray)
    if(CIQ.downloadCSV){
        downloadCSV(csvArray)
    }
    let csvContent = csvArray.map(e => e.join(",")).join("\n");
    return csvContent 
};
 function adjustStartDateToLastYear(startDate){
    const year = Math.floor(startDate / 10000000000000); // 提取年份
    return parseInt(year-1 + '' + '0101')*1000000000
 }
 function dropOHLCV(content){
    return content.map(array => array.slice(-10));
 }
 function downloadCSV(csvArray){
     let csvContent = "data:text/csv;charset=utf-8," 
     + csvArray.map(e => e.join(",")).join("\n");
     
     var encodedUri = encodeURI(csvContent); 
     var link = document.createElement("a"); 
     link.setAttribute("href", encodedUri); 
     let fileName = 'test.csv'
     //let fileName = CIQ.store.state.chart.indicators.formIndicators.entry + ' & ' + CIQ.store.state.chart.indicators.formIndicators.exit + '.csv'
     link.setAttribute("download", fileName); 
     document.body.appendChild(link);
     link.click();
 }
 
 function generateFinalOutput(arrData,finalData,sd,index,indexNum,criteria){
     if(!sd.type) return finalData
     var resultIndex = ''
     var categoryList = CIQ.store.getters.getTechnicalCategory
     // todo, rerun获取conditionRadio
     var conditionRadio = CIQ.store.state.form.conditionRadio[criteria][indexNum]
     var formatSmallNum = function(num){
        //  if(num>-0.005 && num<0){return -0.01}
        //  else if(num>0 && num<0.005){return 0.01}
        //  else{return num}
        return num
     }
     // technical indicators
     for(var _class in categoryList){
         var studies = categoryList[_class].studies
         for(var _study in studies){
             if(sd.type == studies[_study].url){
                 var category = categoryList[_class].class
                 switch(category){
                     case("CCI_like"):{
                         // output only indicator value 
                         resultIndex = Object.keys(sd.outputMap)[0]
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;      
                         }
                         
                         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                         break
                     }
                     case("MACD_like"):{
                         //MACD ‌macd‌
                         for(var i in Object.keys(sd.outputMap)){
                             var keywordList = []
                             switch(conditionRadio){
                                 case('Indicator Value'):{
                                     keywordList = ['MACD ‌macd‌','Klinger ‌Klinger‌','Rel Vig ‌Rel Vig‌']
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                                     break
                                 }
                                 case('Indicator Value '):{
                                     keywordList = ['_hist']
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_SL'
                                     break
                                 }
                                 case('Indicator Hist'):{
                                     keywordList = ['_hist']
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_hist'
                                     break
                                 }
                                 default:
                             }
                             for(var k in keywordList){
                                 if(Object.keys(sd.outputMap)[i].search(keywordList[k]) != -1){
                                     resultIndex = Object.keys(sd.outputMap)[i]
                                 }
                             }
                             
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         break
                     }
                     case("BollingerBands_like"):{
                         // use Bottom Top Median in output map
                         //Use Indicator High/Medium/Low Band raw data whichever is chosen in the drop list. 
                         for(var i in Object.keys(sd.outputMap)){
                             var keywordList = []
                             switch(conditionRadio){
                                 case('LB'):{
                                     keywordList = ['Bottom','Low']
                                     break
                                 }
                                 case('HB'):{
                                     keywordList = ['Top','High']
                                     break
                                 }
                                 case('MB'):{
                                     keywordList = ['Median']
                                     break
                                 }
                                 default:
                             }
                             labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_'+conditionRadio
                             for(var k in keywordList){
                                 // todo, 防止 'High Low Top High Low'这样的outputMap扰乱了keywordList的判断
                                 if(Object.keys(sd.outputMap)[i].replaceAll(sd.type,'').search(keywordList[k]) != -1){
                                     resultIndex = Object.keys(sd.outputMap)[i]
                                 }
                             }
                             
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         
                         break
                     }
                     case("EFT_like"):{
                         var signalResultIndex = ''
                         for(var i in Object.keys(sd.outputMap)){
                             var keywordList = []
                             var signalKeywordList = []
                             switch(conditionRadio){
                                 case('Indicator Value'):{
                                     keywordList = ['EF ‌Ehler Fisher‌','KST ‌Pring KST‌','PMO ‌PMO‌','TII ‌Trend Int‌']
                                     for(var k in keywordList){
                                         if(Object.keys(sd.outputMap)[i].search(keywordList[k]) != -1){
                                             resultIndex = Object.keys(sd.outputMap)[i]
                                         }
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                                     break
                                 }
                                 case('Indicator Value '):{
                                     keywordList = ['EF ‌Ehler Fisher‌','KST ‌Pring KST‌','PMO ‌PMO‌','TII ‌Trend Int‌']
                                     signalKeywordList = ['Trigger','Signal']
                                     for(var k in signalKeywordList){
                                         if(Object.keys(sd.outputMap)[i].search(signalKeywordList[k]) != -1){
                                             signalResultIndex = Object.keys(sd.outputMap)[i]
                                         }
                                     }
                                     for(var k in keywordList){
                                         if(Object.keys(sd.outputMap)[i].search(keywordList[k]) != -1){
                                             resultIndex = Object.keys(sd.outputMap)[i]
                                         }
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_SL'
                                     break
                                 }
                                 default:
                             }
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
 
                         for(var item in arrData){
                             if(conditionRadio == 'Indicator Value'){
                                 finalData[item][index] = arrData[item][resultIndex] || arrData[item][resultIndex]==0
                                 ?parseFloat(arrData[item][resultIndex].toFixed(CIQ.countDecimalPlaces(arrData[item][resultIndex])))
                                 :null;
                             }else{
                                 let result = formatSmallNum(arrData[item][resultIndex])
                                 let signalResult = formatSmallNum(arrData[item][signalResultIndex])
                                 let resultMinus = formatSmallNum(result-signalResult)
                                 
                                 if(result!=null &&signalResult!=null){
                                     finalData[item][index] = parseFloat(resultMinus.toFixed(CIQ.countDecimalPlaces(resultMinus)))
                                 }else{
                                     finalData[item][index] =  null
                                 }
                             }
                         }
                         break
                     }
                     case("Stochastics_like"):{
                         var resultIndexK = ''
                         var resultIndexD = ''

                         for(var i in Object.keys(sd.outputMap)){
                             var signalKeywordList = []
                             switch(conditionRadio){
                                 case('%K'):{
                                     
                                     if(Object.keys(sd.outputMap)[i].search(conditionRadio) != -1){
                                         resultIndexK = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_%K'
                                     break
                                 }
                                 case('%D'):{
                                     if(Object.keys(sd.outputMap)[i].search(conditionRadio) != -1){
                                         resultIndexD = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_%D'
                                     break
                                 }
                                 case('%K '):{
                                     if(Object.keys(sd.outputMap)[i].search('%K') != -1){
                                         resultIndexK = Object.keys(sd.outputMap)[i]
                                     }
                                     if(Object.keys(sd.outputMap)[i].search('%D') != -1){
                                         resultIndexD = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_%K-%D'
                                     break
                                 }
                                 default:
                             }
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             if(conditionRadio == '%K'){
                                 let result = formatSmallNum(arrData[item][resultIndexK])
                                 finalData[item][index] = result || result==0
                                 ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                                 :null;
                             }else if(conditionRadio == '%D'){
                                 let result = formatSmallNum(arrData[item][resultIndexD])
                                 finalData[item][index] = result || result==0
                                 ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                                 :null;
                             }else if(conditionRadio == '%K '){
                                 let resultK = formatSmallNum(arrData[item][resultIndexK])
                                 let resultD = formatSmallNum(arrData[item][resultIndexD])
                                 let resultMinus = formatSmallNum(resultK-resultD)
                                 if(resultK!=null && resultD!=null){
                                     finalData[item][index] = parseFloat(resultMinus.toFixed(CIQ.countDecimalPlaces(resultMinus)))
                                 }else{
                                     finalData[item][index] =  null
                                 }
                             }
                         }
                         break
                     }
                     case("ERI_like"):{
                         for(var i in Object.keys(sd.outputMap)){
                             switch(conditionRadio){
                                 case('Indicator hist1'):{
                                     if(Object.keys(sd.outputMap)[i].search('_hist1') != -1){
                                         resultIndex = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_hist1'
                                     break
                                 }
                                 case('Indicator hist2'):{
                                     if(Object.keys(sd.outputMap)[i].search('_hist2') != -1){
                                         resultIndex = Object.keys(sd.outputMap)[i]
                                     }
                                    labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_hist2'
                                     break
                                 }
                                 default:
                             }
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         break
                     }
                     case("ADX_like"):{
                         for(var i in Object.keys(sd.outputMap)){
                             switch(conditionRadio){
                                 case('+DI ADX'):{             
                                     if(sd.outputMap[Object.keys(sd.outputMap)[i]]=="+DI"){
                                         resultIndex = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_+DI'
                                     break
                                 }
                                 case('-DI ADX'):{
                                     if(sd.outputMap[Object.keys(sd.outputMap)[i]]=="-DI"){
                                         resultIndex = Object.keys(sd.outputMap)[i]
                                     }
                                    labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_-DI'
                                     break
                                 }
                                 default:
                             }
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         break
                     }
                     case("MovingAverage_like"):{ 
                         // output only indicator value 
                         
                         resultIndex = Object.keys(sd.outputMap)[0]
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                         break
                     }
                     case("Aligator_like"):{
                         var {radio,radioValue,techValue} = JSON.parse(conditionRadio)
                         var _conditionRadio = radio
 
                         var resultIndexRadioValue = ''
                         var resultIndexTechValue = ''
                         for(var i in Object.keys(sd.outputMap)){
                             
                             switch(_conditionRadio){
                                 case('first'):{
                                     if(Object.keys(sd.outputMap)[i].toLowerCase().search(techValue.toLowerCase()) != -1){
                                         resultIndex = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_'+techValue
                                     break
                                 }
                                 case('second'):{
                                     if(Object.keys(sd.outputMap)[i].toLowerCase().search(radioValue.toLowerCase()) != -1){
                                         resultIndexRadioValue = Object.keys(sd.outputMap)[i]
                                     }
                                     if(Object.keys(sd.outputMap)[i].toLowerCase().search(techValue.toLowerCase()) != -1){
                                         resultIndexTechValue = Object.keys(sd.outputMap)[i]
                                     }
                                     labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_'+ radioValue + '-' + techValue
                                     break
                                 }
                                 default:
                             }
                         }
                         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
                         for(var item in arrData){
                             if(_conditionRadio != 'second'){
                                 let result = formatSmallNum(arrData[item][resultIndex])
                                 finalData[item][index] = result || result==0
                                 ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                                 :null;
                             }else{
                                 let resultRadioValue = formatSmallNum(arrData[item][resultIndexRadioValue])
                                 let resultTechValue = formatSmallNum(arrData[item][resultIndexTechValue])
                                 let resultMinus = formatSmallNum(resultRadioValue-resultTechValue)
                                 if(resultRadioValue!=null &&resultTechValue!=null){
                                     finalData[item][index] = parseFloat(resultMinus.toFixed(CIQ.countDecimalPlaces(resultMinus)))
                                 }else{
                                     finalData[item][index] =  null
                                 }
                             }
                         }
                         break
                     }
                     case("LRF_like"):{
                         // output only indicator value 
                         resultIndex = Object.keys(sd.outputMap)[0]
                         var keywordList = ['Forecast ‌Lin Fcst‌‌','Forecast ‌Time Fcst‌']
                         for(var i in Object.keys(sd.outputMap)){
                             for(var k in keywordList){
                                 if(Object.keys(sd.outputMap)[i].search(keywordList[k]) != -1){
                                     resultIndex = Object.keys(sd.outputMap)[i]
                                 }
                             }
                         }
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                         break
                     }
                     case("Trailingstop_like"):{
                         // output only indicator value 
                         resultIndex = Object.keys(sd.outputMap)[0]
                         var keywordList = ['Result ‌PSAR‌','All Stops ‌ATR Trailing Stop‌']
                         for(var i in Object.keys(sd.outputMap)){
                             for(var k in keywordList){
                                 if(Object.keys(sd.outputMap)[i].search(keywordList[k]) != -1){
                                     resultIndex = Object.keys(sd.outputMap)[i]
                                 }
                             }
                         }
                         for(var item in arrData){
                             let result = formatSmallNum(arrData[item][resultIndex])
                             finalData[item][index] = result || result==0
                             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                             :null;
                         }
                         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
                         break
                     }
                     default:{
 
                     }
                 }
             }
         }
     } 
     // 优先级最高，超越ma和normal indicators
     // find if there is a ma line attachs to an indicator
 
     const ciq_studies = CIQ.stxx.layout.studies
 
     for(var j in ciq_studies){
         var s = ciq_studies[j]
         if(!s) continue
         // normal senti indicator with ROCLike or symbol ohlcv with ROCLike or STMA with ROCLIKE
         if(
             s.type == "ST ROCLike" && 
             (s.inputs.Field == sd.type || s.inputs.Field == sd.inputs.Field || conditionRadio == 'Indicator Moving Average') &&
             s.parameters.criteria == criteria &&
             s.parameters.index == indexNum
         ){
             let matchedSubstring = '';
             for(var i in Object.keys(arrData[arrData.length-10])){
                 if(Object.keys(arrData[arrData.length-10])[i].indexOf(s.inputs.display) !== -1){
                    matchedSubstring = s.inputs.condition                                            
                 }
                 if(matchedSubstring &&
                     Object.keys(s.outputMap).indexOf(Object.keys(arrData[arrData.length-10])[i]) != -1){
                    //  if(Object.keys(arrData[arrData.length-10])[i] == 'supLine') continue
                     resultIndex = Object.keys(arrData[arrData.length-10])[i]
                 }
             }
             // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
             for(var item in arrData){
                 let result = formatSmallNum(arrData[item][resultIndex])
                 finalData[item][index] = result || result==0
                 ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                 :null;
             }
             labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_'+matchedSubstring
             return finalData
         }
 
         //如果是stma roc,则stma,roc, conditionRadio同时满足下面条件，这个判断会先进去，导致bug 
        //  e.g.
        //  ‌   ST MA‌ (5,model_smart_dumb_spread,ma,0)       // condtion 1: stma5 
        //     ‌ST MA‌ (5,model_smart_dumb_spread,ma,0)-2
        //     ST ROCLike‌ (MA ‌ST MA‌ (5,model_smart_dumb_spread,ma,0)-2,ROC,21,n)    // condtion 2: stma5 with roc21
        //     model_smart_dumb_spread‌ (13,n)

         let findROC = false
         for(var i in ciq_studies){
             if(ciq_studies[i].type == "ST ROCLike" &&
                ciq_studies[i].parameters.criteria == criteria &&
                ciq_studies[i].parameters.index == indexNum 
             ) findROC = true
         }
         // normal senti indicator with MA Line(the second sentiment indicator condition)
         if(
             s.type == "ST MA" && 
             s.inputs.Field == sd.type && 
             conditionRadio == 'Indicator Moving Average' &&
             s.parameters.criteria == criteria &&
             s.parameters.index == indexNum &&
             !findROC 
         ){
             for(var i in Object.keys(arrData[arrData.length-10])){
                 if(Object.keys(arrData[arrData.length-10])[i].indexOf(s.name) != -1){
                     resultIndex = Object.keys(arrData[arrData.length-10])[i]
                 }
             }
             
             // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
             for(var item in arrData){
                 let result = formatSmallNum(arrData[item][resultIndex])
                 finalData[item][index] = result || result==0
                 ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                 :null;
             }
             labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_ma' + s.days
             return finalData
         }

         // normal senti indicator with MA Line(the third sentiment indicator condition)
         if(
            s.type == "ST MA" && 
            s.inputs.Field == sd.type && 
            conditionRadio == 'Indicator Value ' &&
            s.parameters.criteria == criteria &&
            s.parameters.index == indexNum &&
            !findROC 
        ){
            for(var i in Object.keys(arrData[arrData.length-10])){
                if(Object.keys(arrData[arrData.length-10])[i].indexOf(s.name) != -1){
                    resultIndex = Object.keys(arrData[arrData.length-10])[i]
                }
            }
            
            // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
            for(var item in arrData){
                let maValue = formatSmallNum(arrData[item][resultIndex])
                let sentiValue = formatSmallNum(arrData[item][sd.type])
                let resultMinus = formatSmallNum(sentiValue-maValue)

                // 任何一个参与计算中间量为null时，结果为null
                if(maValue!=null && sentiValue!=null){
                    finalData[item][index] = resultMinus!=null
                    ?parseFloat(resultMinus.toFixed(CIQ.countDecimalPlaces(resultMinus)))
                    :null;
                }else{
                    finalData[item][index] = null
                }
            }
            labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_minus_ma' + s.days
            return finalData
        }
 
         // MovingAverage-Like with MA Line
         if(
             s.type == "ST MA" && 
             // todo: field随时可以变
             //s.inputs.Field == "field" && 
             sd.type == "ma" && 
             conditionRadio == 'Moving Average' &&
             s.parameters.criteria == criteria &&
             s.parameters.index == indexNum
         ){
             var resultIndexMA = ''
             for(var i in Object.keys(arrData[arrData.length-10])){
                 if(Object.keys(arrData[arrData.length-10])[i].indexOf(s.name) != -1){
                     resultIndex = Object.keys(arrData[arrData.length-10])[i]
                 }
                 if(Object.keys(arrData[arrData.length-10])[i].indexOf(sd.name) != -1){
                     resultIndexMA = Object.keys(arrData[arrData.length-10])[i]
                 }
             }
             // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
 
             for(var item in arrData){
                 let result = formatSmallNum(arrData[item][resultIndex])
                 let resultMA = formatSmallNum(arrData[item][resultIndexMA])
                 let resultMinus = formatSmallNum(result - resultMA)
                 if(result!=null && resultMA!=null){
                    finalData[item][index] = parseFloat(resultMinus.toFixed(CIQ.countDecimalPlaces(resultMinus)));
                 }else{
                    finalData[item][index] = null
                 }
            }
             labelOption[criteria.includes('entry')?indexNum:indexNum+5] = '_ma' + s.days
             return finalData
         }
     }
     // find if this study is a normal sentiment indicator
    /********************lishan modify start*************************/
    if( CIQ.findSentiIndicator(null,sd.type) || CIQ.isUserIndicator(sd.type) || CIQ.isOwnIndicator(sd.type)){
    /********************lishan modify end*************************/
         resultIndex = sd.type
         
         let firstDateIndex
         // 当为用户自定义日期指标时，如果当前下标没指标的值且不为0， 且当前日期大于第一天日期时。 设值为0
         if(resultIndex.includes('UserDefinedDates:') || resultIndex.includes('User Defined Dates')) {
            firstDateIndex = arrData.findIndex(obj => !!obj[resultIndex]);

            for(var item in arrData){
                let result = formatSmallNum(arrData[item][resultIndex])
                if(!(result || result==0) && (item > firstDateIndex)) result = 0
                finalData[item][index] = result || result==0
                ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                :null;     
            }
         } else {
            // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
            for(var item in arrData){
                let result = formatSmallNum(arrData[item][resultIndex])
                finalData[item][index] = result || result==0
                ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
                :null;     
            }
         }

         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
     }else if( CIQ.findSymbolIndicator(sd.type,null) ){
         resultIndex = Object.keys(sd.outputMap)[0]
         // load a value of this study to dataframe(important note: the value of correspond resultIndex is caculated differently)
 
         for(var item in arrData){
             let result = formatSmallNum(arrData[item][resultIndex])
             finalData[item][index] = result || result==0
             ?parseFloat(result.toFixed(CIQ.countDecimalPlaces(result)))
             :null;     
         }
 
         labelOption[criteria.includes('entry')?indexNum:indexNum+5] = ''
     }   
     
     return finalData
 }

/**
 * 
 * @param {*} criteria , criteria includes entry,entry2,exit,exit2
 * @returns 
 */
 CIQ.showScore = async function(criteria){  
    CIQ.addCover()
    CIQ.nprogress.start()

    const criteriaCat = criteria.startsWith('entry') ? 'entry' : 'exit'
    let finalData = []
    let ohlcvRows = []
    
    const comparisonSymbol = CIQ.store.getters.getComparisonSymbol

    let study = CIQ.stxx.layout.studies[Object.keys(CIQ.stxx.layout.studies).pop()]
    if(study == undefined){ return }
    // 因为scrubbed不包含没数据的row
    let JSONData = study.chart.dataSet
    //先转化json
    let _arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    // 给数组内容换好位置
    for(var i in _arrData){
        let item = _arrData[i]
        // 考虑统一用dataSet总长度，symbol没有的一行用null
        let close = item.Close || null
        let open = item.Open || null
        let high = item.High || null
        let low = item.Low || null
        if(comparisonSymbol.url && ['entry2','exit2'].includes(criteria)) {
            close = item[comparisonSymbol.url]?item[comparisonSymbol.url].Close:null
            open = item[comparisonSymbol.url]?item[comparisonSymbol.url].Open:null
            high = item[comparisonSymbol.url]?item[comparisonSymbol.url].High:null
            low = item[comparisonSymbol.url]?item[comparisonSymbol.url].Low:null
        }
        ohlcvRows.push({
            'SC': close,
            'SO': open,
            'SH': high,
            'SL': low,
        })
        
        let obj = {
            [`${criteriaCat}_1`]: '',
            [`${criteriaCat}_2`]: '',
            [`${criteriaCat}_3`]: '',
            [`${criteriaCat}_4`]: '',
            [`${criteriaCat}_5`]: '', 
        };
        finalData.push(obj);
    }

    // find the correspond sd type
    CIQ.store.state.chart.indicators.formIndicators[criteria].forEach((value,index)=>{
        var _index = ''
        var indexNum
        var sd = {}
        for(var i in CIQ.stxx.layout.studies){
            var _sd = CIQ.stxx.layout.studies[i]
            // 如果indicator不是ma (那就是senti,own,users,其他tech'),则不考虑criteria和index
            // if(!_sd.parameters.criteria && _sd.type == value){
           if( 
               !_sd.parameters.criteria && 
               _sd.type == value && 
               // 如果_sd.parameters.isComparison,own,users, 不需判断_sd.parameters.isComparison
               (!_sd.parameters.hasOwnProperty('isComparison') || !_sd.parameters.isComparison)
           ){
               _index = `${criteriaCat}_`+(index+1)
               indexNum = index
               sd = _sd
               continue;
           }
           if( 
               _sd.type == value &&
               _sd.parameters.criteria == criteria &&
               _sd.parameters.index == index
           ){
               _index = `${criteriaCat}_`+(index+1)
               indexNum = index
               sd = _sd
           }
        }
        finalData = generateFinalOutput(_arrData,finalData,sd,_index,indexNum,criteria)
    })

    // TODO ,逐个拿entry1, entry2 ...的条件来对比finalData值是否满足
    
    const signals = cloneDeep(CIQ.store.state.form.backtestInfo)[criteria].signals

    // 特殊情况： 如果comparison是SC即值应该是由Symbol Close - Value得来，
    // 然而我们默认是只上传Value,这里需要单独判断并计算finalData那一列的值
    // for(let signalIndex in signals) {
    //     if(signals[signalIndex].comparison == 'SC') {
    //         // TODO ,这里需要计算finalData那一列的值
    //         finalData.forEach((item,idx) => {
    //             item[`${criteriaCat}_${Number(signalIndex)+1}`] = _arrData[idx]['Close'] - item[`${criteriaCat}_${Number(signalIndex)+1}`]
    //         });
    //     }
    // }
    const evalatedList = evaluateAll(finalData, signals, ohlcvRows)
    console.log('evalatedList: ', evalatedList)
    await CIQ.store.dispatch('chart/save_criteria_scorelist',evalatedList.map(item=>Object.values(item).reduce((sum,num)=>sum+num,0)))
    for (let studyInstanceName in CIQ.stxx.layout.studies) {
        if (
          CIQ.stxx.layout.studies[studyInstanceName].type == 'CriteriaScore'
        ) {
          CIQ.Studies.removeStudy(
            CIQ.stxx,
            CIQ.stxx.layout.studies[studyInstanceName]
          )
        }
      }
    let sd = CIQ.Studies.addStudy(CIQ.stxx, 'CriteriaScore', {
    }, null,{ 
        criteria: criteria, 
        index: null 
    }) 
    CIQ.stxx.panels[sd.panel].holder.children[0].style.backgroundColor = '##5b9bd133'

    CIQ.hideCover()
    CIQ.nprogress.done()
};

function evaluateAll(finalData, signals, ohlcvRows) {
    return finalData.map((row, rowIndex) => {
      const entryKeys = Object.keys(row)
        .filter(k => /^(entry|exit)_\d+$/.test(k))
        .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
  
      const result = {};
  
      for (let i = 0; i < entryKeys.length; i++) {
        const key = entryKeys[i];
        const rawVal = row[key];
  
        // 空值 => 0
        if (rawVal === '' || rawVal === null || rawVal === undefined || Number.isNaN(Number(rawVal))) {
          result[key] = 0;
          continue;
        }
  
        // signals 下标越界 => 0
        if (i >= signals.length) {
          result[key] = 0;
          continue;
        }
  
        const signal = signals[i];
        const ok = evaluateCondition(rawVal, signal, { finalData, ohlcvRows, rowIndex, keyIndex: i });
        result[key] = ok ? 1 : 0;
      }
  
      return result;
    });
  }
  
  function evaluateCondition(rawVal, signal, ctx = {}) {
    const cond = signal.condition; // 0: >, 1: ==, 2: <, 3: cross_above, 4: cross_below
    let comparison
    let value
    const { finalData, ohlcvRows, rowIndex, keyIndex } = ctx;
    // Symbol Close 对比 Value
    if(["SC","SO","SH","SL"].includes(signal.comparison)) {
        comparison = Number(ohlcvRows[rowIndex][signal.comparison]);
        value = Number(rawVal);
        console.log(rowIndex,comparison,value)
    }
    // if comparison equal "MAMA" or the value equal "SL", "D","JAW", "TEETH", "LIPS", value = 0.
    else if(signal.comparison=='MA' || ["SL", "D","JAW", "TEETH", "LIPS","SVMA"].includes(signal.value)) {
        comparison = Number(rawVal);
        value = 0;
    }
    // The type of remaining part of value is float or int, is himself.
    else if(!isNaN(Number(signal.value))) {
        comparison = Number(rawVal);
        value = Number(signal.value);
    }

    //console.log('comparison, value', comparison, value, ctx.rowIndex, CIQ.stxx.chart.dataSet[ctx.rowIndex])

    if (!isFinite(value) || !isFinite(comparison)) return false;
  
    // 大于
    if (cond === 0) return comparison > value;
  
    // 等于
    if (cond === 1) return comparison == value;
  
    // 小于
    if (cond === 2) return comparison < value;
  
    // 金叉（cross_above）
    if (cond === 3) {
      if (!finalData || rowIndex <= 0) return false;
  
      let prevComparison
      let prevValue
      if(["SC","SO","SH","SL"].includes(signal.comparison)) {
        prevComparison = Number(ohlcvRows[rowIndex - 1][signal.comparison]);
        prevValue = getPrevIndicatorData(finalData, rowIndex, keyIndex);
        if (!isFinite(prevComparison) || !isFinite(prevValue)) return false;
        return prevComparison <= prevValue && comparison > value;
      } else {
        prevComparison = getPrevIndicatorData(finalData, rowIndex, keyIndex);
        if (!isFinite(prevComparison)) return false;
        return prevComparison <= value && comparison > value;
      }
    }
  
    // 死叉（cross_below）
    if (cond === 4) {
        if (!finalData || rowIndex <= 0) return false;
  
        let prevComparison
        let prevValue
        if(["SC","SO","SH","SL"].includes(signal.comparison)) {
          prevComparison = Number(ohlcvRows[rowIndex - 1][signal.comparison]);
          prevValue = getPrevIndicatorData(finalData, rowIndex, keyIndex);
          if (!isFinite(prevComparison) || !isFinite(prevValue)) return false;
          return prevComparison >= prevValue && comparison < value;
        } else {
          prevComparison = getPrevIndicatorData(finalData, rowIndex, keyIndex);
          if (!isFinite(prevComparison)) return false;
          return prevComparison >= value && comparison < value;
        }  
    }
  
    return false;
  }
  
  function getPrevIndicatorData(finalData, rowIndex, keyIndex) {
    const prevRow = finalData[rowIndex - 1];
    const prevKey = Object.keys(prevRow)
      .filter(k => /^(entry|exit)_\d+$/.test(k))
      .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]))[keyIndex];
    return Number(prevRow[prevKey]);
  }
}
export {__st_js_generateCsv_}
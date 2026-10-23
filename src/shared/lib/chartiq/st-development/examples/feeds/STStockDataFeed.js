/**
 *	2.2.0
 *	customized quotefeed
 */
const quoteFeedSimulator = {};
import {config} from "./STDataFeedAccessUrl.js"
import {CIQ} from "chartiq/js/standard.js"
import jutils from 'jutils-src'
import LRUCache from 'lru-cache';
import _this from "@/main";
import {decodeBase64} from '@/utils'
import {recoverSymbolOptixUrl,getSymbolInfo} from '@/utils/globalFunc'
import { formatStandardTime } from '@/utils'
import { deleteBacktest, getRelatedBacktest } from '@/service/service'

// 目前只给pairdata LRU缓存
const cache = new LRUCache({
  max: 100, // 缓存的最大项数
  maxAge: 1000 * 60 * 5, // 缓存项的生命周期为5分钟
});
function getCachedData(url) {
    const cachedData = cache.get(url);
    if (cachedData) {
        // console.log('!!!!get cachedData!!!!: ',cachedData.config.url)
        return Promise.resolve(cachedData);
    } else {
        return CIQ.axios.get(url, { timeout: 10000 }).then((response) => {
            cache.set(url, response);
            return response;
        });
    }
}

quoteFeedSimulator.sendAjax = async function (url, cb) {
    try{
        const res = await getCachedData(url)
        if(res.status==200){
            cb(res.status, res.data);
        }else{
            cb(500)
        }
    }catch(error){
        cb(500)
    }

};

quoteFeedSimulator.url = config.pairDataUrl;

quoteFeedSimulator.sendReq = async function(start,end,new_str,freq,cb){
    let symbol = CIQ.symbol
    const {type} = getSymbolInfo(symbol)
    if(!['stock','index'].includes(type)){
        symbol = process.env.VUE_APP_DEFAULT_SYMBOL
    }
        var queryUrl = this.url + 
        "?symbol=" + symbol + 
        new_str +
        "&start="+start+
        "&end=" + end +
        "&freq=" + freq

    this.sendAjax(queryUrl,async function (status, response){
        const {name} = getSymbolInfo(CIQ.stxx.chart.symbol)
        CIQ.stxx.chart.symbolDisplay = name

        const isWholeData = CIQ.initialDate.start==parseInt(process.env.VUE_APP_START_DATE)
        console.log("moreAvailable:",CIQ.store.$state.scannerai_flag?false:isWholeData?false:true)
        //在scannerai可以默认配置加载全部数据之前先用全局变量判断路由是否为scannerai
        if (status == 200){
            var newQuotes = await quoteFeedSimulator.formatChartData(response);
            cb({
                moreAvailable:CIQ.store.$state.scannerai_flag?false:isWholeData?false:true,
                quotes:newQuotes,
                upToDate: true  // set to true in the initial and pagination fetch callbacks if the responses do not require more "future" data (i.e., forward pagination)
            });
            let view = CIQ.stxx.exportLayout()

        }else{
            cb({error:response ? response : status});
        }
    });
}

quoteFeedSimulator.fetchInitialData = function(symbol,startDate,endDate,params,cb){
    console.timeEnd("bt timer")
    // initEndDate for testing
    this.initEndDate = endDate 
    var oneYear = (24 *60 *60 *1000) * 365

    // 兼容了startDateParse为字符串的情况（save & restore chart layout）
    const startDateParse = params.symbolObject.startDate?params.symbolObject.startDate:startDate
    const endDateParse = params.symbolObject.endDate?params.symbolObject.endDate:endDate
    var startDateTimeStamp = typeof startDateParse == 'string' ? (new Date(startDateParse)).getTime() : startDateParse.getTime()
    var endDateTimeStamp = typeof endDateParse == 'string' ? (new Date(endDateParse)).getTime() : endDateParse.getTime()
    var start = config.timestampToTime(startDateTimeStamp)
    var end = config.timestampToTime(endDateTimeStamp)
    
    // CIQ.initialDate is provided for Marker
    CIQ.initialDate = {start:startDateTimeStamp,end:endDateTimeStamp}

    //this.fetchStatus(symbol,start,end,params.symbolObject.indicator)
    CIQ.symbol = symbol;
    if (params.symbolObject.indicator === undefined){
        if (CIQ.objIndicator === undefined){
            // CIQ.objIndicator = 'AAPL'
            // AAPL
        }
    }else if(params.symbolObject.indicator.length == 0){
        //console.log('load default symbol as indicator', CIQ.objIndicator)
        // when first time loading a technical indicator, no params of indicators in query, pick default value
        //CIQ.objIndicator = ['AAPL']
    }else {
        CIQ.objIndicator = params.symbolObject.indicator
    }
    var new_str = ''

            var orignalFreq = 'daily'
            var selectedFreq = 'daily'

            let list = []
            for(var i in CIQ.objIndicator){
                if(!(CIQ.findBuiltinTechIndicator(null,CIQ.objIndicator[i]) || CIQ.findSymbolIndicator(CIQ.objIndicator[i],null))){
                    list.push(CIQ.objIndicator[i])
                }
            }

            if(params.symbolObject.indicator === undefined){
                new_str += '&indicator='
            }else if(list.length == 0){
                new_str += '&indicator='
            }else{
                try{
                    var freqList = []
                    for ( var  i = 0,valid = 0 ; i < CIQ.objIndicator.length;i++) {
                        // when both sentiment and tech exist in CIQ.objIndicator, filter tech indicator
                        let sentiIndicatorRes = CIQ.findSentiIndicator(null,CIQ.objIndicator[i])
                        if(sentiIndicatorRes){
                            freqList.push(sentiIndicatorRes.updated)
                            new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+recoverSymbolOptixUrl(CIQ.objIndicator[i]);
                            valid++
                            continue
                        }
                        
                        // 之后加一个symbol判断和小李新senti判断
                        /********************lishan modify start*************************/
                        if(CIQ.isUserIndicator(CIQ.objIndicator[i]) || CIQ.isOwnIndicator(CIQ.objIndicator[i]) || CIQ.findSymbolIndicator(CIQ.objIndicator[i],null)){       
                        /********************lishan modify end*************************/  
                            // ownIndicator根据url的最后一位决定timeframe
                            if(CIQ.isOwnIndicator(CIQ.objIndicator[i])){
                                // 加入了myindicator shift相关的编码，修改对应逻辑，兼容无-sh的情况
                                let timeframeCode = CIQ.objIndicator[i].split('-sh')[0].slice(-1)
                                freqList.push(timeframeCode=='0'?'Daily':timeframeCode=='1'?'Weekly':'Monthly')
                            }
                           // new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+recoverSymbolOptixUrl(CIQ.objIndicator[i]);
                            valid++
                            continue
                        }
                    }
                    
                    if(freqList.find(item => item=="Weekly"))  orignalFreq= 'weekly';   
                    if(freqList.find(item => item=="Monthly"))  orignalFreq= 'monthly';  
                }catch(err){
                    console.error(err)
                }
            } 
            // orignalFreq is the minimum timeframe, selectedFreq is the timeframe sent to req, default value is orignalFreq
            selectedFreq = orignalFreq
            switch(CIQ.store.$state.exitFrequency){
                case "Monthly":{
                    selectedFreq = "monthly"
                    break;
                }
                case "Weekly":{
                    if(orignalFreq != 'monthly'){
                        selectedFreq = "weekly"
                    }
                    break;
                }
                case "Daily":{
                    if(orignalFreq != 'monthly' && orignalFreq != 'weekly'){
                        selectedFreq = "daily"
                    } 
                    break;
                }
                default: {
                    break;
                }
            }
            var restoreFreq = CIQ.store.$state.restoreFreq
            if(restoreFreq != ''){
                selectedFreq = restoreFreq
            }
            /** dual symbol, setRestoreFreq从pairdata 226行转移到了loadChart回调，保证view时addSeires仍持有未被清空的restoreFreq*/ 
            // CIQ.store.set_restore_freq('')
            
            // setFreq firstly called when loading aapl symbol during chart initiation, the value is daily by default
            CIQ.store.set_freqency(selectedFreq)
 
            try{
                switch(selectedFreq){
                    case "monthly":{
                        CIQ.periodicity.timeUnit = 'month'
                        break;
                    }
                    case "weekly":{
                        CIQ.periodicity.timeUnit = 'week'
                        break;
                    }
                    case "daily":{    
                        CIQ.periodicity.timeUnit = 'day'
                        break;
                    }
                    default:
                }
            }catch(err){}
            
            var daily=[],weekly=[],monthly=[]
            var nodeSetup = document.getElementsByTagName('li')

            for(var i =0;i<nodeSetup.length;i++){
                if(nodeSetup[i].classList.contains('timeframeResample')) continue
                for(var j in nodeSetup[i].firstChild){
                    if(j == 'textContent'){
                        if(nodeSetup[i].firstChild.textContent === 'Daily'){
                            daily.push(nodeSetup[i])
                        }
                        if(nodeSetup[i].firstChild.textContent === 'Weekly'){
                            weekly.push(nodeSetup[i])
                        }
                        if(nodeSetup[i].firstChild.textContent === 'Monthly'){
                            monthly.push(nodeSetup[i])
                        }
                    }
                }		
			}
        
            var node = document.querySelector("cq-menu-container[cq-name = 'menuPeriodicity']")
            for(var i = 0;i < node.children.length;i++){
                node.children[i].style.display = "inherit"
            }

            //console.log("orignalFreq: ",orignalFreq)

            if(orignalFreq == "monthly"){
                for(var i = 0;i < node.children.length;i++){            
                    if(node.children[i].firstChild.nodeValue == '1 D'){
                        node.children[i].setAttribute('tf','disabled')
                    }
                }
                for(var i = 0;i < node.children.length;i++){            
                    if(node.children[i].firstChild.nodeValue == '1 W'){
                        node.children[i].setAttribute('tf','disabled')
                    }
                }
                

                for(var i = 0;i <daily.length;i++){
                    daily[i].setAttribute('tf','disabled')
                }
                for(var i = 0;i <weekly.length;i++){
                    weekly[i].setAttribute('tf','disabled')
                }
            }else if(orignalFreq == "weekly"){
                for(var i = 0;i <node.children.length;i++){
                    if(node.children[i].firstChild.nodeValue == '1 D'){
                        node.children[i].setAttribute('tf','disabled')
                    }
                }

                for(var i = 0;i < node.children.length;i++){            
                    if(node.children[i].firstChild.nodeValue == '1 W'){
                        node.children[i].setAttribute('tf','enabled')
                    }
                }

                for(var i = 0;i <daily.length;i++){
                    daily[i].setAttribute('tf','disabled')
                }

                for(var i = 0;i <weekly.length;i++){
                    weekly[i].setAttribute('tf','enabled')
   
                }
            }else{
                for(var i = 0;i < node.children.length;i++){            
                    if(node.children[i].firstChild.nodeValue == '1 D'){
                        node.children[i].setAttribute('tf','enabled')
  
                    }
                }
                for(var i = 0;i < node.children.length;i++){            
                    if(node.children[i].firstChild.nodeValue == '1 W'){
                        node.children[i].setAttribute('tf','enabled')
 
                    }
                }
    
                for(var i = 0;i <daily.length;i++){
                    daily[i].setAttribute('tf','enabled')
  
                }
                for(var i = 0;i <weekly.length;i++){
                    weekly[i].setAttribute('tf','enabled')

                }
            }

            this.sendReq(start,end,new_str,selectedFreq,cb)
};

quoteFeedSimulator.fetchUpdateData = function (symbol, startDate, params,cb){
    var start = config.timestampToTime(Date.parse(this.initEndDate))

    // if (params.symbolObject.indicator === undefined){
    //     params.symbolObject.indicator = symbol
    // }

    // fetch indicator
    var new_str = ''
    var freq = 'daily'

    let list = []
    for(var i in CIQ.objIndicator){
        if(!CIQ.findBuiltinTechIndicator(null,CIQ.objIndicator[i])){
            list.push(CIQ.objIndicator[i])
        }
    }

    if(params.symbolObject.indicator === undefined){
        //console.log('CIQ.objIndicator is not defined');
        //new_str += '&indicator=' +CIQ.objIndicator;
        new_str += '&indicator='
    }else if(list.length == 0){
        //new_str += '&indicator=' +'AAPL'
        new_str += '&indicator='
    }else{
        try{
            var freqList = []
            for ( var  i = 0,valid = 0 ; i < CIQ.objIndicator.length;i++) {
                // when both sentiment and tech exist in CIQ.objIndicator, filter tech indicator
                let sentiIndicatorRes = CIQ.findSentiIndicator(null,CIQ.objIndicator[i])
                if(sentiIndicatorRes){
                    freqList.push(sentiIndicatorRes.updated)
                    new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+CIQ.objIndicator[i];
                    valid++
                    continue
                }
                
                // 之后加一个symbol判断和小李新senti判断
                if(CIQ.isUserIndicator(CIQ.objIndicator[i]) || CIQ.findSymbolIndicator(CIQ.objIndicator[i],null)){       
                    new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+CIQ.objIndicator[i];
                    valid++
                    continue
                }
            }
            
            if(freqList.find(item => item=="Weekly"))  freq= 'weekly';   
            if(freqList.find(item => item=="Monthly"))  freq= 'monthly';  
        }catch(err){
            console.error(err)
        }
    }   
    switch(CIQ.store.$state.exitFrequency){
        case "Monthly":{
            freq = "monthly"
            break;
        }
        case "Weekly":{
            freq = "weekly"
            break;
        }
        case "Daily":{
            freq = "daily"
            break;
        }
        default:
    }

    const {type} = getSymbolInfo(symbol)
    if(!['stock','index'].includes(type)){
        symbol = process.env.VUE_APP_DEFAULT_SYMBOL
    }
    var queryUrl = this.url + 
       "?symbol=" + symbol + 
        new_str +
       "&start="+start + 
       "&freq=" + freq;

   // console.log("update: ",queryUrl);

    // this.sendAjax(queryUrl,function(status, response){
    //     if (status == 200){
    //         var newQuotes = quoteFeedSimulator.formatChartData(response);
            
    //         cb({quotes:newQuotes});
    //     }else{
    //         cb({error:response ? response:status});
    //     }    
    // });
};

quoteFeedSimulator.fetchPaginationData = function(symbol, suggestedStartDate, endDate, params,cb){
    //console.log("comparation for pag and init: ", config.timestampToTime(Date.parse(suggestedStartDate)), config.timestampToTime(CIQ.initialDate.start))
   
    var start = config.timestampToTime(Date.parse(suggestedStartDate)) 
    var end = config.timestampToTime(Date.parse(endDate)) 
    console.log('Pagination urlstart: '+start + ' end:'+end);

    var new_str = ''
    var freq = 'daily'

    let list = []
    for(var i in CIQ.objIndicator){
        if(!CIQ.findBuiltinTechIndicator(null,CIQ.objIndicator[i])){
            list.push(CIQ.objIndicator[i])
        }
    }

    if(params.symbolObject.indicator === undefined){
        //console.log('CIQ.objIndicator is not defined');
        //new_str += '&indicator=' +CIQ.objIndicator;
        new_str += '&indicator='
    }else if(list.length == 0){
        //new_str += '&indicator=' +'AAPL'
        new_str += '&indicator='
    }else{
        try{
            var freqList = []
            for ( var  i = 0,valid = 0 ; i < CIQ.objIndicator.length;i++) {
                // when both sentiment and tech exist in CIQ.objIndicator, filter tech indicator
                let sentiIndicatorRes = CIQ.findSentiIndicator(null,CIQ.objIndicator[i])
                if(sentiIndicatorRes){
                    freqList.push(sentiIndicatorRes.updated)
                    new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+CIQ.objIndicator[i];
                    valid++
                    continue
                }
                
                // 之后加一个symbol判断和小李新senti判断
                if(CIQ.isUserIndicator(CIQ.objIndicator[i]) || CIQ.isOwnIndicator(CIQ.objIndicator[i]) || CIQ.findSymbolIndicator(CIQ.objIndicator[i],null)){       
                    new_str += `${valid==0?'&indicator=':`&indicator_${valid+1}=`}`+CIQ.objIndicator[i];
                    valid++
                    continue
                }
            }
            
            if(freqList.find(item => item=="Weekly"))  freq= 'weekly';   
            if(freqList.find(item => item=="Monthly"))  freq= 'monthly';  
        }catch(err){
            console.error(err)
        }
    }   
    switch(CIQ.store.$state.exitFrequency){
        case "Monthly":{
            freq = "monthly"
            break;
        }
        case "Weekly":{
            freq = "weekly"
            break;
        }
        case "Daily":{
            freq = "daily"
            break;
        }
        default:
    }   

    const {type} = getSymbolInfo(symbol)
    if(!['stock','index'].includes(type)){
        symbol = process.env.VUE_APP_DEFAULT_SYMBOL
    }
    var queryUrl = this.url + 
       "?symbol=" + symbol + 
        new_str +
       "&start="+start+
       "&end=" + end + 
       "&freq=" + freq;
    //console.log("pagination: ",queryUrl);

    this.sendAjax(queryUrl,async function(status,response){
        if(status == 200){
            var newQuotes = await quoteFeedSimulator.formatChartData(response);
           // console.log(suggestedStartDate,suggestedStartDate.getTime(),parseInt(process.env.VUE_APP_START_DATE),suggestedStartDate.getTime() > parseInt(process.env.VUE_APP_START_DATE))
            cb({
                moreAvailable: (response.length > 1) && suggestedStartDate.getTime() > parseInt(process.env.VUE_APP_START_DATE),
                quotes: newQuotes, 
                upToDate: endDate.getTime() >=  Date.now()
            });     
            
        }else{
            cb({error: response ? response :status})
        }
    })

}

// filter markerSet by given start date and end date during backtest setup
quoteFeedSimulator.filterMarkerDate = function(start_date,end_date,markerSet){
    let list = []
    let _date = {
        start: jutils.formatDate(start_date,"YYYYMMDD"),
        end: jutils.formatDate(end_date,"YYYYMMDD")
    }
    for(var date in markerSet){
        let markerSetDate = markerSet[date].DT.slice(0,4)+markerSet[date].DT.slice(5,7)+markerSet[date].DT.slice(8,10)
        if(markerSetDate>_date.start && markerSetDate<=_date.end){
            list.push(markerSet[date])
        }
    }
    //console.log(_date,list)
    return list
}

quoteFeedSimulator.formatChartData = async function(response){
    var data = response
    if(data == null){
        data = []
    }
    
    var newQuotes = [];
    var oneDay = (24 *60 *60 *1000) * 0

    let objIndicatorFirstDate = {};
    if(CIQ.objIndicator && typeof CIQ.objIndicator !== 'string'){
        CIQ.objIndicator.forEach((item) => {
            if(CIQ.findSentiIndicator(null,item)) objIndicatorFirstDate[item] = null;
        });
    }

    var indicatorCutoffIndices = {};
    if(!(CIQ.objIndicator && typeof CIQ.objIndicator == 'string')){
        for(var j in CIQ.objIndicator){
            var indicatorKey = CIQ.objIndicator[j];
            var str = j==0?'indicator_Close':`indicator${Number(j)+1}_Close`; 
            indicatorCutoffIndices[indicatorKey] = data.map(i=>i[str]).findLastIndex(el => el !== null);
        }
    }
    try{
        const {type} = getSymbolInfo(CIQ.symbol)
        if(type == 'custom'){
            // 可能是custom symbol
                const url = decodeBase64(CIQ.symbol.split('||')[1])
                let res
                try {
                    res = await CIQ.store.get_mysymbolCSV({url:url,timeframe:CIQ.store.$state.pairDataFreq})
                } catch (err) {console.error(err)}
                let sortedRows = res.sort(
                    (a, b) => new Date(a.DT) - new Date(b.DT)
                );
                //console.time('🚗Execution Time');
                // 将 data 数组转化为以日期为键的字典
                const dataDict = {};
                data.forEach(item => {
                    dataDict[item.DT] = item;
                });
                for (const i in sortedRows) {
                    newQuotes[i] = {};
                    newQuotes[i].DT = formatStandardTime(sortedRows[i].DT)
                    newQuotes[i].Open = Number(sortedRows[i].Open);
                    newQuotes[i].High = Number(sortedRows[i].High);
                    newQuotes[i].Low = Number(sortedRows[i].Low);
                    newQuotes[i].Close = Number(sortedRows[i].Close);
                    newQuotes[i].Volume = Number(sortedRows[i].Volume);

                    // 默认加载 ‘aapl’，它没有indicator，跳过
                    if(CIQ.objIndicator && typeof CIQ.objIndicator == 'string') continue
                    for(var j in CIQ.objIndicator){
                        var indicatorKey = CIQ.objIndicator[j];
                        var str = j==0?'indicator_Close':`indicator${Number(j)+1}_Close`; 

                        // 如果某个指标的最后有效数据的索引已经被记录并且小于当前索引，跳过
                        if (i > indicatorCutoffIndices[indicatorKey]) {
                            newQuotes[i][indicatorKey] = null;
                            continue;
                        }

                        //let matchedItem = data.find(item=>item.DT == sortedRows[i].DT)
                        let matchedItem = dataDict[sortedRows[i].DT]
                        // 如果为空则判断是否为第一个，是则设为0，不是则设值为前一个
                        if(matchedItem){
                            if(objIndicatorFirstDate[indicatorKey] == null) objIndicatorFirstDate[indicatorKey] = newQuotes[i].DT
                            newQuotes[i][indicatorKey] = matchedItem[str];
                        }else{
                            if(i==0){
                                newQuotes[i][indicatorKey] = null;
                            }else{
                                //console.log('indicator值出现空值',data[i])
                                newQuotes[i][indicatorKey] = newQuotes[i-1][indicatorKey]
                            }
                        }
                    } 
                }
                //console.timeEnd('🚗Execution Time');
        }else{
            let sentiList = []
            for(var j in CIQ.objIndicator){
                let indicator = CIQ.findSentiIndicator(null,CIQ.objIndicator[j])
                if(indicator) sentiList.push(indicator.url)
            }
            if('High' in data[0]){
                for (var i = 0; i < data.length; i++) {
                    newQuotes[i] = {};
                    
                    newQuotes[i].DT = formatStandardTime(data[i].DT)
                    
                    newQuotes[i].Open = data[i].Open;
                    newQuotes[i].High = data[i].High;
                    newQuotes[i].Low = data[i].Low;
                    newQuotes[i].Close = data[i].Close;
                    newQuotes[i].Volume = data[i].Volume;
                    
                    // 默认加载 ‘aapl’，它没有indicator，跳过
                    if(CIQ.objIndicator && typeof CIQ.objIndicator == 'string') continue
                    let sentiIndex = 0
                    for(var j in CIQ.objIndicator){
                        var indicatorKey = CIQ.objIndicator[j];
                        // 只有sentiment indicator可以被从数据源中读入对应数据到quote,不然就是在对应列留空值
                        if(!sentiList.includes(indicatorKey)){
                            newQuotes[i][indicatorKey] = null;
                            sentiIndex++
                            continue;
                        }
                        var str = sentiIndex==0?'indicator_Close':`indicator${sentiIndex+1}_Close`; 
                        sentiIndex++

                        // 如果某个指标的最后有效数据的索引已经被记录并且小于当前索引，跳过
                        if (i > indicatorCutoffIndices[indicatorKey]) {
                            newQuotes[i][indicatorKey] = null;
                            continue;
                        }

                        // 如果为空则判断是否为第一个，是则设为0，不是则设值为前一个
                        if(data[i][str] != null){
                            if(objIndicatorFirstDate[indicatorKey] == null) objIndicatorFirstDate[indicatorKey] = newQuotes[i].DT
                            newQuotes[i][indicatorKey] = data[i][str];
                        }else{
                            if(i==0){
                                newQuotes[i][indicatorKey] = null;
                            }else{
                                //console.log('indicator值出现空值',data[i])
                                newQuotes[i][indicatorKey] = newQuotes[i-1][indicatorKey]
                            }
                        }
                    }
                } 

                // normal datafeed
                if(!CIQ.isRestoreLayout) {
                    if(window.location.pathname.includes('/scannerai')){
                        CIQ.store.set_chart_type('candle')
                    }else if(window.location.pathname.includes('/myindicator') && CIQ.isOHLCVSelectedMI){    // TODO 考虑用vuex state替代CIQ全局变量
                        CIQ.store.set_chart_type('candle')
                    }else{
                        CIQ.store.set_chart_type('line')
                    }
                }
                CIQ.isRestoreLayout = false
                
                var node = document.querySelector("cq-menu-container[cq-name = 'menuChartStyle']")
                for(var i = 0;i < node.children.length;i++){
                    node.children[i].style.display = "inherit"
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
    
                    // 默认加载 ‘aapl’，它没有indicator，跳过
                    if(CIQ.objIndicator && typeof CIQ.objIndicator == 'string') continue
                    let sentiIndex = 0
                    for(var j in CIQ.objIndicator){
                        var indicatorKey = CIQ.objIndicator[j];
                        // 只有sentiment indicator可以被从数据源中读入对应数据到quote,不然就是在对应列留空值
                        if(!sentiList.includes(indicatorKey)){
                            newQuotes[i][indicatorKey] = null;
                            sentiIndex++
                            continue;
                        }
                        var str = sentiIndex==0?'indicator_Close':`indicator${sentiIndex+1}_Close`; 
                        sentiIndex++ 
                        
                        // 如果某个指标的最后有效数据的索引已经被记录并且小于当前索引，跳过
                        if (i > indicatorCutoffIndices[indicatorKey]) {
                            newQuotes[i][indicatorKey] = null;
                            continue;
                        }

                        // 如果为空则判断是否为第一个，是则设为0，不是则设值为前一个
                        if(data[i][str] != null){
                            if(objIndicatorFirstDate[indicatorKey] == null) objIndicatorFirstDate[indicatorKey] = newQuotes[i].DT
                            newQuotes[i][indicatorKey] = data[i][str];      
                        }else{
                            if(i==0){
                                newQuotes[i][indicatorKey] = null;
                            }else{
                                newQuotes[i][indicatorKey] = newQuotes[i-1][indicatorKey]
                            }
                        }
                    }
                }

                // value Close only
                CIQ.store.set_chart_type('line')

                // CIQ.stxx.setChartType("line"); 
                var node = document.querySelector("cq-menu-container[cq-name = 'menuChartStyle']")
                for(var i = 0;i < node.children.length;i++){
                    node.children[i].style.display = "inherit"
                }
                for(var i = 0;i < node.children.length;i++){
                    if(node.children[i].firstChild.nodeValue != "Line"){
                        node.children[i].style.display = "none"
                    }
                } 
            }
        }

    }catch(err){console.log('error',err)}
    if(CIQ.objIndicator && typeof CIQ.objIndicator !== 'string'){
        /********************lishan modify start*************************/
        for (const j in CIQ.objIndicator) {
            const indicator = CIQ.objIndicator[j];
        
            // 进行 symbol 和 senti 判断，如果需要的话
            // if (indicator.includes('symbol')) {
            //     // 进行相应操作
            // }
            // if (indicator.includes('senti')) {
            //     // 进行相应操作
            // }
        
            if (CIQ.isUserIndicator(indicator)) {
                const [name, hash] = indicator.split(/HASH/);
                const res = await config.csvFileRead(name, hash);
                const datafeed = res.data.data.csv_content;
        
                const sortedRows = datafeed.sort(
                    (a, b) => new Date(a.DT) - new Date(b.DT)
                );
        
                for (const i in sortedRows) {
                    const index = data.findIndex(item => item.DT == sortedRows[i].DT);
                    if (index == -1) {
                        continue;
                    }
                    if (objIndicatorFirstDate[indicator] == null) {
                        objIndicatorFirstDate[indicator] = newQuotes[index].DT;
                    }
                    newQuotes[index][indicator] = parseFloat(sortedRows[i]['indicator_Close']);
                }
            }
            if (CIQ.isOwnIndicator(indicator)) {
                const [_, url] = indicator.split(/CREATE/);
                let res = null
                CIQ.previewIndicatorDataCache = CIQ.previewIndicatorDataCache || {}
                let datafeed = CIQ.previewIndicatorDataCache[url]
                if(!datafeed){
                    let validData = null;
                    try {
                        res = await config.getMyIndicatorData(url);
                    if (res.data.data && Array.isArray(res.data.data)) {
                        validData = res;  // 如果 AnalystRes 有数据, 则使用 AnalystRes
                    }
                    } catch (error) {
                        console.error('Error fetching getMyIndicatorData:', error);
                    }

                    if (!validData) {
                    try {
                        const analystRes = await config.getAnalystMyIndicatorData({url});
                        if((res && res.data.code == 404) && analystRes.data.code == 404) {
                            _this.popUpMsgBox('This backtesting utilizes a user-customized indicator that is unavailable, this page will be refreshed in 5 seconds', 10000)
                            const BTRes = await getRelatedBacktest(url)
                            const count = BTRes.data.count
                            if(count != 0) {
                                const results = BTRes?.data?.results
                                const BTList = results.map(ele => {
                                    const dateString = ele.create_date
                                    const dateTime = new Date(dateString)
                                    const year = dateTime.getFullYear();
                                    const month = String(dateTime.getMonth() + 1).padStart(2, '0')
                                    const day = String(dateTime.getDate()).padStart(2, '0');
                                    const extractedDate = `${year}-${month}-${day}`;
                                    return{id:ele.id, name: ele.name, date: extractedDate}
                                })
                                for (const item of BTList) {
                                    await deleteBacktest(item.id);
                                }
                                setTimeout(() => {
                                    window.location.reload();
                                }, 5000); // 5000毫秒 = 6秒
                                if(localStorage.getItem('backtestID')) localStorage.removeItem('backtestID')
                                return
                            }
                        }
                        if (analystRes.data.data && Array.isArray(analystRes.data.data)) {
                            validData = analystRes;  // 如果 AnalystRes 有数据, 则使用 AnalystRes
                        }
                    } catch (error) {
                        console.error('Error fetching getAnalystMyIndicatorData:', error);
                        localStorage.removeItem('backtestID')
                    }
                    }


                    if(validData.data.code == 404) {
                        _this.popUpMsgBox('This backtesting utilizes a user-customized indicator that is unavailable, this page will be refreshed in 5 seconds', 10000)
                        setTimeout(() => {
                            window.location.reload();
                            }, 5000); // 5000毫秒 = 6秒
                        if(localStorage.getItem('backtestID')) localStorage.removeItem('backtestID')
                    }else if(validData.data.code === 401) {
                        _this.popUpMsgBox(validData.data.msg || '')
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000); // 2000毫秒 = 3秒
                        if(localStorage.getItem('backtestID')) localStorage.removeItem('backtestID')
                    }
                    datafeed = validData.data.data;
                    if(!datafeed) return
                    // 暂存
                    CIQ.previewIndicatorDataCache[url] = datafeed
                }

                let sortedRows = datafeed.sort(
                    (a, b) => new Date(a.DT) - new Date(b.DT)
                );
                const appendStr = data[data.length-1].DT.indexOf('000Z') == -1 ? '.000' : '.000Z'
                sortedRows = sortedRows.map(item => ({ ...item, indicator_Close: item.close, DT: item.DT + appendStr }));
                
                for (const i in sortedRows) {
                    const index = data.findIndex(item => item.DT == sortedRows[i].DT);
                    if (index == -1) {
                        continue;
                    }
                    if (objIndicatorFirstDate[indicator] == null) {
                        objIndicatorFirstDate[indicator] = newQuotes[index].DT;
                    }
                
                    newQuotes[index][indicator] = parseFloat(sortedRows[i]['indicator_Close']);
                }
                
            }
        }
        /********************lishan modify end*************************/
        // 停用数据截断，因为technical indicator不能被截断
        // const earliestIndicator = findEarliestIndicator(objIndicatorFirstDate)
        // newQuotes = earliestIndicator=='Invalid Date'?newQuotes:newQuotes.slice(newQuotes.findIndex(item=>item.DT - earliestIndicator == 0))
    }
    CIQ.stxx.setChartType(CIQ.store.$state.chartType);
    return newQuotes
}

function findEarliestIndicator(data) {
    const dates = Object.values(data)
    const earliestDate = new Date(Math.min(...dates));
    return earliestDate;
}

  


export default quoteFeedSimulator;
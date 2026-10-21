// -------------------------------------------------------------------------------------------
// Copyright 2001 - 2021, Sundial Capital Research, Inc. All rights reserved
// -------------------------------------------------------------------------------------------

// import { CIQ, quoteFeed, symbolLookupBase } from "./jsDemo/js/standard.js";
import { CIQ, quoteFeed, symbolLookupBase } from "chartiq/js/standard.js";
import { encodeBase64, createStateFilter, getSymbolInfo } from '@/shared/lib/chartiq/utils'

CIQ.activateImports(quoteFeed, symbolLookupBase); // so we can use CIQ.inheritsFrom
/**
 * An example of an asynchronous Lookup.Driver that uses ChartIQ's suggestive search as its source for symbol search
 * @name CIQ.ChartEngine.Driver.Lookup.ChartIQ
 * @constructor
 * @param {string[]} exchanges An array of exchanges that can be searched against
 * @private
 * @since 6.0.0
 */
CIQ.ChartEngine.Driver.Lookup.ChartIQ = function (exchanges) {
	this.exchanges = exchanges;
	this.requestCounter = 0; //used to invalidate old requests
};

CIQ.inheritsFrom(
	CIQ.ChartEngine.Driver.Lookup.ChartIQ,
	CIQ.ChartEngine.Driver.Lookup
);
/**
 * @memberof CIQ.ChartEngine.Driver.Lookup.ChartIQ
 * @param {string} text Text to search for
 * @param {string} filter Any filter to be applied to the search results
 * @param {number} maxResults Max number of results to return from the server
 * @param {function} cb Callback upon results
 * @private
 * @since 6.0.0
 */
 const collator = new Intl.Collator('en');
 function SortArray(x, y){
    return collator.compare(x.data.symbol, y.data.symbol);
}

CIQ.ChartEngine.Driver.Lookup.ChartIQ.prototype.acceptText = async function (
	text,
	filter,
	maxResults,
	cb
) {
    var loader = document.querySelector(".loaderLookup");
    if (loader) loader.show();  
    if (filter == 'ALL'){
        var resultsIndexsList = [];
        const indexsList = CIQ.store.getters.getIndexList
        let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
        for (var i = 0; i < indexsList.length; i++) {
            var fields = indexsList[i]; 
            var item = {
                symbol: fields.symbol,
                name: fields.name,
                exchDisp: ""
            };
            concatList.push(item)
            resultsIndexsList.push({
                display: [item.symbol, item.name],
                data: item
            });
        }
        var resultsStocksList = [];
        const stocksList = CIQ.store.getters.getStockList
        for (var i = 0; i < stocksList.length; i++) {
            var fields = stocksList[i];
            var item = {
                symbol: fields.stock,
                name: fields.name,
                exchDisp: " "
            };
            concatList.push(item)
            resultsStocksList.push({
                display: [item.symbol, item.name],
                data: item
            });
        }

        var resultsCustomSymbolList = [];
        const mySymbolList = CIQ.store.getters.getMySymbollist
        mySymbolList.forEach(element => {
            // 把name和url拼接在一起，這樣在用戶訪問到此symbol時不用再去請求一次列表
            var item = {
                symbol: encodeBase64(element.name) + '||' + encodeBase64(element.url),
                name: element.name,
                exchDisp: ""
            }
            concatList.push(item)
            resultsCustomSymbolList.push({
                display: [item.name, item.name],
                data: item
            });
        }); 

        let res
        if(text.trim()){
            res = concatList.map(item => ({
                ...item,
                priority: createStateFilter(text)(item),
              }))
              .filter(item => item.priority > 0)
            cb(res.sort((a, b) => b.priority - a.priority).map(item=>{
                /** displayName需要考慮到custom symbol url */
                const {name,url,type} = getSymbolInfo(item.symbol)
                let displayName = url
                if(type == 'custom') displayName = name
                /** END */
                return {
                    display: [displayName, item.name],
                    data: item
                }
            }))
        }else{
            resultsIndexsList.sort(SortArray)
            resultsStocksList.sort(SortArray)
            res = resultsIndexsList.concat(resultsStocksList).concat(resultsCustomSymbolList)
            cb(res);    
        } 
    }
    else if (filter == 'INDEXES'){
			var results = [];
            const indexsList = CIQ.store.getters.getIndexList
            let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
			for (var i = 0; i < indexsList.length; i++) {
				var fields = indexsList[i];
                var item = {
                    symbol: fields.symbol,
                    name: fields.name,
                    exchDisp: ""
                };
                concatList.push(item)
			}
            let res
            if(text.trim()){
                res = concatList.map(item => ({
                    ...item,
                    priority: createStateFilter(text)(item),
                  }))
                  .filter(item => item.priority > 0)
                cb(res.sort((a, b) => b.priority - a.priority).map(item=>{
                    return {
                        display: [item.symbol, item.name],
                        data: item
                    }
                }))
            }else{
                res = concatList.map(item=>{
                    return {
                        display: [item.symbol, item.name],
                        data: item
                    }
                })
                cb(res.sort(SortArray))
            }      
	}else if (filter == 'STOCKS') {
        var results = [];
        const stocksList = CIQ.store.getters.getStockList
        let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
        for (var i = 0; i < stocksList.length; i++) {
            var fields = stocksList[i];
            var item = {
                symbol: fields.stock,
                name: fields.name,
                exchDisp: " "
            };
            concatList.push(item)
        }
        let res
        if(text.trim()){
            res = concatList.map(item => ({
                ...item,
                priority: createStateFilter(text)(item),
              }))
              .filter(item => item.priority > 0)
            cb(res.sort((a, b) => b.priority - a.priority).map(item=>{
                return {
                    display: [item.symbol, item.name],
                    data: item
                }
            }))
        }else{
            res = concatList.map(item=>{
                return {
                    display: [item.symbol, item.name],
                    data: item
                }
            })
            cb(res.sort(SortArray))
        } 
    } else if (filter == 'MY FAVORITES'){
        var results = []
        await CIQ.store.dispatch('chart/get_favorite')
        var resu = CIQ.store.getters.getFavoriteSymbolList
            try {
                var listStock = CIQ.store.getters.getStockList.map(_obj=>{
                        var newObj = {}
                        newObj['name'] = _obj.name
                        newObj['url'] = _obj.stock
                        return newObj
                    })


                var listIndex = CIQ.store.getters.getIndexList.map(_obj=>{
                    var newObj = {}
                    newObj['name'] = _obj.name
                    newObj['url'] = _obj.symbol
                    return newObj
                })

                var list = [...listStock,...listIndex]
                
                resu.forEach(element => {
                    const matchedItem = list.find(item=>item.url == element)
                    if(!matchedItem) return;
                    var item = {
                        symbol: element,
                        name: matchedItem.name,
                        exchDisp: ""
                    }
                    if (
                        item.symbol.toUpperCase().indexOf(text.toUpperCase()) !== -1 ||
                        item.name.toUpperCase().indexOf(text.toUpperCase()) !== -1
                    ){
                        results.push({
                            display: [item.symbol, item.name],
                            data: item
                        });
                    }         
                }); 
               // console.log(results)
            } catch (e) {console.error(e)}
            results.sort(SortArray)    
            cb(results);
    } else if (filter == 'CUSTOM SYMBOL') {
        var results = []
        const mySymbolList = CIQ.store.getters.getMySymbollist
        mySymbolList.forEach(element => {
            // 把name和url拼接在一起，這樣在用戶訪問到此symbol時不用再去請求一次列表
            var item = {
                symbol: encodeBase64(element.name) + '||' + encodeBase64(element.url),
                name: element.name,
                exchDisp: ""
            }
            
            if (
                item.symbol.toUpperCase().indexOf(text.toUpperCase()) !== -1 ||
                item.name.toUpperCase().indexOf(text.toUpperCase()) !== -1
            ){
                results.push({
                    display: [item.name, item.name],
                    data: item
                });
            }
        }); 
        cb(results)
    } else if (filter == 'SYMBOLS') {
        var results = []
        const symbollistForecast = CIQ.store.getters.getSymbollistForecast
        let stocksList = CIQ.store.getters.getStockList
        let indexsList = CIQ.store.getters.getIndexList
        symbollistForecast.forEach(element => {
            const stocks = stocksList.find(i=>i.stock.toUpperCase() == element.market.toUpperCase() || i.name.toUpperCase() == element.market.toUpperCase())
            const indexs = indexsList.find(i=>i.symbol.toUpperCase() == element.market.toUpperCase() || i.name.toUpperCase() == element.market.toUpperCase())
            let res = stocks || indexs
            if(res){
                var item = {
                    symbol: res.stock || res.symbol,
                    name: res.name,
                    exchDisp: "",
                    market: element.market,
                }
                
                if (
                    item.symbol.toUpperCase().indexOf(text.toUpperCase()) !== -1 ||
                    item.name.toUpperCase().indexOf(text.toUpperCase()) !== -1
                ){
                    results.push({
                        display: [item.symbol, item.name],
                        data: item
                    });
                }
            }else console.log('symbol does not exist in list',element.market)

        }); 
        cb(results)
    } 
    if (loader) loader.hide();  
};
export { CIQ };

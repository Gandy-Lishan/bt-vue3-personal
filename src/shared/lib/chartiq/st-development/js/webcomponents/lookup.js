import {
	symbolCsvFileDelete,
} from '@/shared/lib/chartiq/service-stub'
import {decodeBase64, encodeBase64, createStateFilter, getSymbolInfo} from '@/shared/lib/chartiq/utils'

const collator = new Intl.Collator('en');
function SortArray(x, y){
   return collator.compare(x.data.symbol, y.data.symbol);
}

let __js_webcomponents_lookup_ = (_exports) => {

    /* global _CIQ, _timezoneJS, _SplinePlotter */
    
    
    
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    if (!CIQ.ChartEngine.Driver) {
        console.error(
            "lookup component requires first activating quoteFeed feature."
        );
    } else if (!CIQ.ChartEngine.Driver.Lookup) {
        console.error(
            "lookup component requires first activating symbolLookupBase feature."
        );
    } else {
        /**
         * Symbol lookup component `<cq-lookup>`.
         *
         * A {@link CIQ.ChartEngine.Driver.Lookup} must be connected to this web component. The lookup
         * driver searches financial exchanges for symbols that match the text entered in the
         * component's input field.
         *
         * The symbol lookup can be toggled using the Ctrl+Alt+S keystroke combination (see the
         * `symbolLookup` action in `hotkeyConfig.hotkeys` in *js/defaultConfiguration.js*).
         *
         * A default lookup driver is specified in the chart configuration object (see the
         * <a href="tutorial-Chart%20Configuration.html" target="_blank">Chart Configuration</a>
         * tutorial).
         *
         * You can provide a different driver in the following ways:
         * - Assign the driver to the
         *   <a href="tutorial-Chart%20Configuration.html#lookupdriver" target="_blank">
         *   <code class="codeLink">lookupDriver</code></a> property of the chart configuration
         *   object
         * - Connect the driver to this component using
         *   [setDriver]{@link WebComponents.cq-lookup#setDriver}
         * - Add the driver to the UI context with {@link CIQ.UI.Context#setLookupDriver}
         *
         * **Note:** If the lookup component is unable to access a lookup driver, the component's
         * input field is active, but the component does not produce results.
         *
         * **Keyboard control**
         *
         * When selected with tab key navigation and activated with Return/Enter, this component has
         * the following internal controls:
         * - Up/Down arrow &mdash; Move selection between search input, filters, and search results
         * - Left/Right arrow &mdash; Switch between search result filters
         *
         * **Attributes**
         * | Name | Description | Valid Values |
         * | ---- | ----------- | ------------ |
         * | <code style="white-space: nowrap">cq-keystroke-claim</code> | Enables processing of keyboard input. | <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#boolean_attributes" target="_blank">Boolean attribute</a> |
         * | <code style="white-space: nowrap">cq-keystroke-default</code> | Enables the component to respond to keystrokes when the lookup input field does not have focus. <p style="margin-bottom: 0">**Warning:** This feature may conflict with keyboard shortcuts set in other components. | <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#boolean_attributes" target="_blank">Boolean attribute</a> |
         * | <code style="white-space: nowrap">cq-uppercase</code> | Forces text to uppercase. | <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#boolean_attributes" target="_blank">Boolean attribute</a> |
         * | <code style="white-space: nowrap">cq-exchanges</code> | Specifies a list of financial exchanges searched by the lookup driver. Overrides the `exchanges` parameter of {@link CIQ.ChartEngine.Driver.Lookup}. | Comma-delimited list of exchange names; for example, "futures,govt,muni,corp"|
         *
         * **Customization**
         *
         * To hide the lookup results window, modify the CSS as follows:
         * ```css
         * .stxMenuActive cq-lookup-results { opacity: 0 }
         * ```
         *
         * To preload default results (rather than an empty result pane) on initial load , set an
         * `onChartReady` handler in the chart configuration object (see the
         * <a href="tutorial-Chart%20Configuration.html" target="_blank">Chart Configuration</a>
         * tutorial); for example:
         *
         * ```
         * config.onChartReady = (stx) => {
         *     const defaultResults = [
         *         {
         *             "display": ["KW", "Kennedy - Wilson Holdings Inc", "NYSE"],
         *             "data": {
         *                 "symbol": "KW",
         *                 "name": "Kennedy - Wilson Holdings Inc",
         *                 "category ": "NYSE"
         *             }
         *         },
         *         {
         *             "display": ["RWR", "SPDR Series Trust - SPDR DJ Wilshire REIT ETF", "NYSEArca"],
         *             "data": {
         *                 "symbol": "RWR",
         *                 "name": "SPDR Series Trust - SPDR DJ Wilshire REIT ETF",
         *                 "category": "NYSEArca"
         *             }
         *         }
         *     ];
         *
         *     const UISymbolLookup = document.querySelector(".ciq-search cq-lookup");
         *     UISymbolLookup.results(defaultResults);
         * }
         * ```
         *
         * @namespace WebComponents.cq-lookup
         * @since
         * - 4.0.0 Added optional `cq-uppercase` attribute.
         * - 7.4.0 Added optional `cq-exchanges` attribute.
         * - 8.3.0 Enabled internal keyboard navigation and selection.
         *
         * @example
         * <cq-lookup cq-keystroke-claim cq-uppercase cq-keystroke-default>
         *     <cq-lookup-input cq-no-close>
         *         <input type="text" spellcheck="false" autocomplete="off"
         *                autocorrect="off" autocapitalize="none" name="symbol"
         *                placeholder="Enter Symbol">
         *         <cq-lookup-icon></cq-lookup-icon>
         *     </cq-lookup-input>
         *     <cq-lookup-results>
         *         <cq-lookup-filters cq-no-close>
         *             <cq-filter class="true">ALL</cq-filter>
         *             <cq-filter>STOCKS</cq-filter>
         *             <cq-filter>FX</cq-filter>
         *             <cq-filter>INDEXES</cq-filter>
         *             <cq-filter>FUNDS</cq-filter>
         *             <cq-filter>FUTURES</cq-filter>
         *         </cq-lookup-filters>
         *         <cq-scroll></cq-scroll>
         *     </cq-lookup-results>
         * </cq-lookup>
         */
        class Lookup extends CIQ.UI.ContextTag {
            constructor() {
                super();
                this.usingEmptyDriver = false;
                this.currentFilter = null;
                // Will hold references to filter tabs for keyboard navigation
                this.filterElements = null;
                this.params = {};

                this.searchResults = [];    //搜索结果
                this.currentPage = 1;
                this.pageSize = 20;
                this.hasMore = true;
            }
    
            /**
             * With the decoupling of the uiHelper to the Lookup.Driver you must be sure to include both an argument for maxResults and the closure to handle the results.
             * maxResults must either be a number or a string to result in default value of 100.
             * @alias acceptText
             * @memberof WebComponents.cq-lookup#
             * @since 3.0.0
             */
            acceptText(value, filter) {
                var self = this;
                if (!this.params.driver) {
                    if (this.context.lookupDriver) {
                        this.setDriver(this.context.lookupDriver);
                    } else {
                        this.setDriver(new CIQ.ChartEngine.Driver.Lookup());
                        this.usingEmptyDriver = true;
                    }
                }
                
                var restoredExchanges = this.params.driver.exchanges;
                function closure(results) {
                    self.params.driver.exchanges = restoredExchanges;
                    self.results(results);

                    let stClose = self.getElementsByClassName("st-close")
                    if(filter == 'CUSTOM SYMBOL'){
                        for(let el = 0;el<stClose.length;el++){     
                            const _result = results
                            const _el = el
                            CIQ.UI.stxtap(stClose[el],async ()=>{
                                try {
                                    let url = decodeBase64(_result[_el].data.symbol.split('||')[1])
                                    await symbolCsvFileDelete(url)

                                    await CIQ.store.get_mysymbolist()
                                    console.log('删除成功')
                                } catch (error) {
                                    console.log('删除失败', error)
                                }
                            });       
                        }               
                    }
                }
                var exchanges = this.getAttribute("cq-exchanges");
                if (exchanges) this.params.driver.exchanges = exchanges.split(",");
                
                // this.params.driver.acceptText(value, filter, null, closure);
                this.filters_data(value, filter, null, closure)  
            }

            async filters_data(text,filter,params, closure){
                var loader = document.querySelector(".loaderLookup");
                if (loader) loader.show();  
                if (filter == 'ALL'){
                    var resultsIndexsList = [];
                    const indexsList = CIQ.store.$state.indexsList
                    let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
                    for (var i = 0; i < indexsList.length; i++) {
                        var fields = indexsList[i]; 
                        var item = {
                            symbol: fields.symbol,
                            name: fields.name,
                            category: fields.category,
                            inception: fields.inception,
                        };
                        concatList.push(item)
                        resultsIndexsList.push({
                            display: [item.symbol, item.name, item.category, item.inception],
                            data: item
                        });
                    }
                    var resultsStocksList = [];
                    const stocksList = CIQ.store.$state.stocksList
                    for (var i = 0; i < stocksList.length; i++) {
                        var fields = stocksList[i];
                        var item = {
                            symbol: fields.stock,
                            name: fields.name,
                            category: fields.category,
                            inception: fields.inception,
                        };
                        concatList.push(item)
                        resultsStocksList.push({
                            display: [item.symbol, item.name, item.category, item.inception],
                            data: item
                        });
                    }
                    var resultsCustomSymbolList = [];

                    if(!window.location.pathname.includes('/myindicator')) {
                        const mySymbolList = CIQ.store.$state.mySymbolList
                        mySymbolList.forEach(element => {
                            // 把name和url拼接在一起，這樣在用戶訪問到此symbol時不用再去請求一次列表
                            var item = {
                                symbol: encodeBase64(element.name) + '||' + encodeBase64(element.url),
                                name: element.name,
                                category: "Custom",
                                inception: "",
                            }
                            concatList.push(item)
                            resultsCustomSymbolList.push({
                                display: [item.name, item.name],
                                data: item
                            });
                        }); 
                    }
            
                    let res
                    if(text.trim()){
                        res = concatList.map(item => ({
                            ...item,
                            priority: createStateFilter(text)(item),
                          }))
                          .filter(item => item.priority > 0)
                        this.searchResults = res.sort((a, b) => b.priority - a.priority).map(item=>{
                            /** displayName需要考慮到custom symbol url */
                            const {name,url,type} = getSymbolInfo(item.symbol)
                            let displayName = url
                            if(type == 'custom') displayName = name
                            /** END */
                            return {
                                display: [displayName, item.name, item.category, item.inception],
                                data: item
                            }
                        })
                    }else{
                        resultsIndexsList.sort(SortArray)
                        resultsStocksList.sort(SortArray)
                        res = resultsIndexsList.concat(resultsStocksList).concat(resultsCustomSymbolList)
                        this.searchResults = res;    
                    } 
                }
                else if (filter == 'INDEXES'){
                        var results = [];
                        const indexsList = CIQ.store.$state.indexsList
                        let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
                        for (var i = 0; i < indexsList.length; i++) {
                            var fields = indexsList[i];
                            var item = {
                                symbol: fields.symbol,
                                name: fields.name,
                                category: fields.category,
                                inception: fields.inception,
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
                            this.searchResults = res.sort((a, b) => b.priority - a.priority).map(item=>{
                                return {
                                    display: [item.symbol, item.name, item.category, item.inception],
                                    data: item
                                }
                            })
                        }else{
                            res = concatList.map(item=>{
                                return {
                                    display: [item.symbol, item.name, item.category, item.inception],
                                    data: item
                                }
                            })
                            this.searchResults = res.sort(SortArray) 
                        }      
                }else if (filter == 'STOCKS') {
                    var results = [];
                    const stocksList = CIQ.store.$state.stocksList
                    let concatList = [] // 用於新的搜索過濾方法，無視stock或者index類別
                    for (var i = 0; i < stocksList.length; i++) {
                        var fields = stocksList[i];
                        var item = {
                            symbol: fields.stock,
                            name: fields.name,
                            category: fields.category,
                            inception: fields.inception,
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
                        this.searchResults = res.sort((a, b) => b.priority - a.priority).map(item=>{
                            return {
                                display: [item.symbol, item.name, item.category, item.inception],
                                data: item
                            }
                        })
                    }else{
                        res = concatList.map(item=>{
                            return {
                                display: [item.symbol, item.name, item.category, item.inception],
                                data: item
                            }
                        })
                        this.searchResults = res.sort(SortArray)
                    } 
                } else if (filter == 'MY FAVORITES'){
                    var results = []
                    await CIQ.store.get_favorite()
                    var resu = CIQ.store.$state.favoriteSymbolList
                        try {
                            var listStock = CIQ.store.$state.stocksList.map(_obj=>{
                                    var newObj = {}
                                    newObj['name'] = _obj.name
                                    newObj['url'] = _obj.stock
                                    newObj['category'] = _obj.category
                                    newObj['inception'] = _obj.inception
                                    return newObj
                                })
            
            
                            var listIndex = CIQ.store.$state.indexsList.map(_obj=>{
                                var newObj = {}
                                newObj['name'] = _obj.name
                                newObj['url'] = _obj.symbol
                                newObj['category'] = _obj.category
                                newObj['inception'] = _obj.inception
                                return newObj
                            })
            
                            var list = [...listStock,...listIndex]
                            
                            resu.forEach(element => {
                                const matchedItem = list.find(item=>item.url == element)
                                if(!matchedItem) return;
                                var item = {
                                    symbol: element,
                                    name: matchedItem.name,
                                    category: matchedItem.category,
                                    inception: matchedItem.inception,
                                }
                                if (
                                    item.symbol.toUpperCase().indexOf(text.toUpperCase()) !== -1 ||
                                    item.name.toUpperCase().indexOf(text.toUpperCase()) !== -1
                                ){
                                    results.push({
                                        display: [item.symbol, item.name, item.category, item.inception],
                                        data: item
                                    });
                                }         
                            }); 
                           // console.log(results)
                        } catch (e) {console.error(e)}
                        results.sort(SortArray)    
                        this.searchResults = results
                } else if (filter == 'CUSTOM SYMBOL') {
                    var results = []
                    const mySymbolList = CIQ.store.$state.mySymbolList
                    mySymbolList.forEach(element => {
                        // 把name和url拼接在一起，這樣在用戶訪問到此symbol時不用再去請求一次列表
                        var item = {
                            symbol: encodeBase64(element.name) + '||' + encodeBase64(element.url),
                            name: element.name,
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
                    this.searchResults = results
                } else if (filter == 'SYMBOLS') {
                    var results = []
                    const symbollistForecast = CIQ.store.$state.symbollistForecast
                    let stocksList = CIQ.store.$state.stocksList
                    let indexsList = CIQ.store.$state.indexsList
                    symbollistForecast.forEach(element => {
                        const stocks = stocksList.find(i=>i.stock.toUpperCase() == element.market.toUpperCase() || i.name.toUpperCase() == element.market.toUpperCase())
                        const indexs = indexsList.find(i=>i.symbol.toUpperCase() == element.market.toUpperCase() || i.name.toUpperCase() == element.market.toUpperCase())
                        let res = stocks || indexs
                        if(res){
                            var item = {
                                symbol: res.stock || res.symbol,
                                name: res.name,
                                category: "",
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
                    this.searchResults = results
                } 
                if (loader) loader.hide();  

                this.currentPage = 1;
                this.hasMore = true;
                this.loadMore(closure)
            };
            loadMore(closure) {
                // 根据页码从过滤后的结果中分页
                console.log('paginated results',this.currentPage, this.searchResults.length)
                const paginatedResults = this.searchResults.slice(0, this.currentPage * this.pageSize);
                if(this.currentPage * this.pageSize > this.searchResults.length) this.hasMore = false
                // 将分页后的数据传递给 closure
                closure(paginatedResults);
            }
            attachDriver(driver) {
                this.driver = driver;
            }
    
            close() {
                if (this.keyboardNavigation) {
                    // Position the highlight over the input to wait for the collapse animation to complete
                    this.highlightItem(this.input[0]);
                    // Reposition the highlight after css animation is complete.
                    setTimeout(this.highlightItem.bind(this, this.input[0]), 250);
    
                    // Remove any focused property from the filter tabs
                    this.removeFocused(this.filterElements);
                    // Remove keyboard control from scroll
                    this.resultList[0].keyboardNavigation = null;
                }
                this.closest("cq-dialog,cq-menu").close();
            }
    
            forceInput() {
                var input = this.input[0];
                this.selectItem({ symbol: input.value });
                CIQ.blur(input);
                this.close();
                input.value = "";
            }
    
            initialize() {
                this.addDefaultMarkup();
                var node = this.node;
                this.resultList = node.find("cq-scroll");
                this.input = node.find("input");
                if (!this.input.length) {
                    var hiddenInput = document.createElement("input");
                    hiddenInput.setAttribute("type", "hidden");
                    hiddenInput.value = "";
                    this.input = node.append(hiddenInput);
                }
                CIQ.UI.stxtap(this.input[0], function () {
                    this.focus();
                });
                var self = this;
                
                Array.from(this.input).forEach(function (input) {
                    input.addEventListener("paste", function (e) {
                        var input = e.target;
                        setTimeout(function () {
                            self.acceptText(input.value, self.currentFilter);  
                        }, 0);
                    });
                });
                var filters = this.querySelector("cq-lookup-filters");
                if (filters) {
                    var allFilters = filters.querySelectorAll("cq-filter");

                    if(this.parentNode.className == 'ciq-search'){
                        const ciqSearchNode = document.querySelector(".ciq-nav")
                        var lookupInput = ciqSearchNode.querySelector("cq-lookup-input");
                        CIQ.UI.stxtap(lookupInput, function () {
                            if(document.querySelector('.ciq-search').active) return;
                            allFilters.forEach(async function (f) { 
                                if(f.classList.contains("true")){    
                                    // 激活look bar前更新列表
                                    self.acceptText(self.input.val(), f.innerHTML);
                                }
                            });
                        });
                    }
                    else{
                        var comparisonInput = document.querySelector(".cq-comparison-new")
                        CIQ.UI.stxtap(comparisonInput, function () {
                            allFilters.forEach(async function (f) { 
                                if(f.classList.contains("true")){    
                                    //await self.updateMySymbol(self.input.val(), f.innerHTML)
                                    self.acceptText(self.input.val(), f.innerHTML);
                                }
                            });
                        });
                    }

                    allFilters.forEach(function (filter) {
                        CIQ.UI.stxtap(filter, function () {
                            allFilters.forEach(function (f) {
                                f.classList.remove("true");
                            });
                            this.classList.add("true");
                            var translate = this.querySelector("translate");
                            if (translate) {
                                // if the filter text has been translated then it will be in a <translate> tag
                                self.currentFilter = translate.getAttribute("original");
                            } else {
                                self.currentFilter = this.innerHTML;
                            }
                            self.acceptText(self.input.val(), self.currentFilter);
                        });
                    });

                    // 【Vue2→Vue3 兼容】原 Vuex watch 已移除 — Pinia 模式下列表变化由组件重新渲染处理
                }
    
                if (typeof node.attr("cq-keystroke-claim") != "undefined") {
                    // add keyboard claim for entire body
                    this.addClaim(this);
                }
                self.currentFilter = "ALL" 

                this.resultList[0].addEventListener('scroll', (event)=>self.scrollHandler(event));
            }

            // 监听滚动事件以触发加载更多数据
            scrollHandler(event) {
                event.stopPropagation(); // 阻止事件冒泡

                var self = this;
                var restoredExchanges = this.params.driver.exchanges;
                function closure(results) {
                    self.params.driver.exchanges = restoredExchanges;
                    self.results(results);

                    let stClose = self.getElementsByClassName("st-close")
                    if(self.currentFilter == 'CUSTOM SYMBOL'){
                        for(let el = 0;el<stClose.length;el++){     
                            const _result = results
                            const _el = el
                            CIQ.UI.stxtap(stClose[el],async ()=>{
                                try {
                                    let url = decodeBase64(_result[_el].data.symbol.split('||')[1])
                                    await symbolCsvFileDelete(url)

                                    await CIQ.store.get_mysymbolist()
                                    console.log('删除成功')
                                } catch (error) {
                                    console.log('删除失败', error)
                                }
                            });       
                        }               
                    }
                }
                const scrollableElement = event.target;

                // 判断是否接近底部，加载下一页数据
                if (scrollableElement.scrollHeight - scrollableElement.scrollTop - 10 < scrollableElement.clientHeight) {
                    // 到达底部，加载下一页数据
                    if (!this.hasMore) return;
                    
                    // 记录当前滚动位置
                    const currentScrollTop = scrollableElement.scrollTop;
                    self.currentPage++;
                    self.loadMore((results) => {
                        closure(results);
            
                        // 恢复滚动位置
                        requestAnimationFrame(() => {
                            scrollableElement.scrollTop = currentScrollTop;
                        });
                    });
                }
            };
            isActive() {
                return this.input[0].value !== "";
            }
    
            // Note that this captures keystrokes on the body. If the input box is focused then we need to allow the input box itself
            // to handle the strokes but we still want to capture them in order to display the lookup results. We first check
            // activeElement to see if the input is focused. If so then we bypass logic that manipulates the input.value. In order make
            // sure that the lookup menu is responding to an up-to-date input.value therefore we have to put all of those pieces of code
            // in setTimeout(0)
            //
            // Note that when comparisons are enabled, there are two Lookup components on the screen. Each keypress will therefore pass
            // through this function twice, once for each Lookup component. Only the active component will process the keystroke.
            keyStroke(hub, key, e, keystroke) {
                if (keystroke.ctrl || keystroke.cmd) return false;
                if (key == "Meta" || key == "Win") return false;
    
                var input = this.input[0];
                var result = false;
                var focused = document.activeElement === input; // If focused then we need to allow the input box to get most keystrokes
                // Rejecting alt key combinations only when the input is out of focus because some special chars can be typed with an alt key
                if (
                    !focused &&
                    (e.altKey ||
                        (document.activeElement &&
                            (document.activeElement.tagName == "INPUT" ||
                                document.activeElement.tagName == "TEXTAREA")))
                ) {
                    return false; // either an alt key combination was pressed or some other input has focus
                }
    
                var iAmActive = false,
                    iAmDisplayed = false;
                if (CIQ.climbUpDomTree(this, ".stxMenuActive").length) {
                    iAmDisplayed = true; // if my menu chain is active then I'm alive
                }
                if (focused || iAmDisplayed) iAmActive = true; // If my input is focused or I'm displayed, then I'm alive
                if (!iAmActive) {
                    // Otherwise, I may still be alive under certain conditions
                    if (typeof this.node.attr("cq-keystroke-default") == "undefined")
                        return; // I'm always alive if I have default body keystrokes
                    if (!iAmDisplayed && this.uiManager.topMenu()) return; // unless there's another menu active and it isn't me
                }
                if ((key === " " || key === "Spacebar") && input.value === "") {
                    return false;
                }
                var self = this;
                var focusedElements = this.findFocused(this.filterElements);
    
                switch (key) {
                    case "Delete":
                    case "Backspace":
                    case "Del":
                        
                        if (input.value.length>=0) {
                            //ctrl-a or highlight all text + delete implies remove all text
                            if (window.getSelection().toString()) {
                                input.value = "";
                            } else {
                                if (!focused)
                                    input.value = input.value.substring(0, input.value.length - 1);
                                if (input.value.length>=0) {
                                    self.acceptText(input.value, self.currentFilter);
                                }
                            }
    
                            result = true; // only capture delete key if there was something to delete
                        }
                        if (key == "Backspace") result = true; // always capture backspace because otherwise chrome will navigate back
                        break;
                    case "Escape":
                    case "Esc":
                        input.value = "";
                        this.close();
                        CIQ.blur(input);
                        result = true;
                        break;
                    case "Enter":
                        if (input.value === "" || !this.isActive()) break;
    
                        var scrollable = this.resultList;
                        focused = scrollable.length && scrollable[0].focused(); // Using cursor keys to maneuver down lookup results
                        if (focused && focused.selectFC) {
                            focused.selectFC.apply(focused, {});
                        } else {
                            //var val = input.value;
                            var val = this.searchResults[0].data.symbol
                            var toUpperCase =
                                ["false", "0", null].indexOf(this.getAttribute("cq-uppercase")) ==
                                -1;
                            if (toUpperCase) val = val.toUpperCase();
                            this.selectItem({ symbol: val });
                        }
    
                        CIQ.blur(input);
                        this.close();
                        input.value = "";
                        result = true;
                        break;
                    case "ArrowRight":
                    case "Right":
                        if (focusedElements.length) {
                            // Remove control from the result list
                            if (this.resultList[0].keyboardNavigation)
                                this.resultList[0].keyboardNavigation = null;
                            // Ignore right if a tab is not focused to allow cursor movement in input
                            this.focusNextItem(this.filterElements);
                            this.clickFocusedItem(this.filterElements, e);
                        }
                        break;
                    case "ArrowLeft":
                    case "Left":
                        // Remove control from the result list
                        if (this.resultList[0].keyboardNavigation)
                            this.resultList[0].keyboardNavigation = null;
                        // Ignore left if a tab is not focused to allow cursor movement in input
                        if (focusedElements.length) {
                            this.focusNextItem(this.filterElements, true);
                            this.clickFocusedItem(this.filterElements, e);
                        }
                        break;
                    case "ArrowDown":
                    case "Down":
                        // Up/Down arrows are only used in this component when keyboard navigation is enabled
                        if (!this.keyboardNavigation) break;
                        // If no tab is focused, then give the first one focus, otherwise, pass control to the resultList
                        focusedElements = this.findFocused(this.filterElements);
                        if (!focusedElements.length) {
                            // If a tab hasn't been focused, highlight the active one.
                            for (
                                let filterIdx = 0;
                                filterIdx < this.filterElements.length;
                                filterIdx++
                            ) {
                                let filterElement = this.filterElements[filterIdx];
                                if (filterElement.classList.contains("true")) {
                                    this.focusItem(filterElement);
                                    break;
                                }
                            }
                        } else if (!this.resultList[0].keyboardNavigation) {
                            // Only pass control to the result list if there are results
                            var resultItem = this.resultList[0].querySelector("cq-item");
                            if (resultItem)
                                this.resultList[0].keyboardNavigation = this.keyboardNavigation;
                        }
                        CIQ.blur(input);
                        break;
                    case "ArrowUp":
                    case "Up":
                        // Up/Down arrows are only used in this component when keyboard navigation is enabled
                        if (!this.keyboardNavigation) break;
                        // resultList has its own up/down control.
                        if (this.resultList[0].keyboardNavigation) {
                            // If the scroll has control, check for the top item selected and move highlight back to the tabs
                            var firstResult = this.resultList[0].querySelector(
                                "cq-item:first-of-type"
                            );
                            if (firstResult && firstResult.hasAttribute("cq-focused")) {
                                firstResult.removeAttribute("cq-focused");
                                this.resultList[0].keyboardNavigation = null;
                                this.highlightFocusedItem(this.filterElements);
                            }
                        } else if (focusedElements.length) {
                            //If a tab has the highlight, reset the highlight back to the input
                            this.removeFocused(focusedElements);
                            this.highlightItem(input);
                            CIQ.focus(input);
                        }
                        break;
                    default:
                        // Prevent keys like Control and ArrowLeft from triggering focus
                        if (key.length === 1) {
                            // Changes the <input> value when keystrokes are registered against the body.
                            if (!focused) input.value = input.value + key;
                            self.acceptText(input.value, self.currentFilter);
                            result = true;
                        }
                        break;
                }
    
                if (result) {
                    // If we're focused, then keep the lookup open unless we hit escape.
                    // Otherwise, if there is no length close it (user hit "escape", "enter", or "backspace/delete" while unfocused)
                    if (
                        this.usingEmptyDriver ||
                        (!input.value.length &&
                            (key == "Escape" || key == "Esc" || key == "Enter" || !focused))
                    ) {
                        this.close();
                    } else {
                        this.open();
                    }
                    if (focused) return { allowDefault: true };
                    return true;
                }
            }
    
            open() {
                // Reposition the highlight after css animation is complete.
                window.setTimeout(this.highlightItem.bind(this, this.input[0]), 250);
                this.closest("cq-dialog,cq-menu").open();
            }
    
            onKeyboardDeselection() {
                CIQ.blur(this.input[0]);
                this.close();
                // If we're using keyboard navigation, return the highlight to the tab selected element
                if (this.keyboardNavigation) this.keyboardNavigation.highlightPosition();
                this.resultList[0].keyboardNavigationWait = false;
            }
    
            onKeyboardSelection() {
                // If we're using keyboard navigation, return the highlight to the tab selected element
                this.highlightItem(this.input[0]);
                CIQ.focus(this.input[0]);
                this.resultList[0].keyboardNavigationWait = true;
                this.open();
            }
    
            /**
             * Displays an array of results returned by the {@link CIQ.ChartEngine.Driver.Lookup}.
             *
             * Each element in the array should be in the following format (see
             * {@link CIQ.ChartEngine.Driver.Lookup#acceptText}):
             * ```
             * {
             *     display: ["symbol ID", "symbol description", "exchange"],
             *     data: {
             *         symbol: "symbol ID",
             *         name: "symbol description",
             *         exchDis: "exchange"
             *     }
             * }
             * ```
             *
             * The lookup component by default displays three columns as represented by the array. The
             * data object can be a format required by your quote feed, or it can be a simple string
             * if you just need to support a stock symbol.
             *
             * @param {array} arr The array of results.
             *
             * @alias results
             * @memberof WebComponents.cq-lookup#
             */
            results(arr) {
                function closure(self, data) {
                    return function (e) {
                        if (e.target.classList.contains('st-close')) return
                        CIQ.blur(self.input[0]);
                        //self.close();
                        self.selectItem(data, ()=>{     /** 新增了手动选择symbol列表的addSymbol的回调 */
                            /** 仅在CPM时，换symbol后移除存在的hover marker*/
                            // important !! 在這兒而不是hideMarkers是因爲不知道爲什麽CPM裏面CIQ.MarkerSample的showMarkers不存在
                            if(window.location.pathname.includes('/cpm/results')){
                                CIQ.Marker.removeByLabel(CIQ.stxx, 'events');
                            }

                            /** 仅在myIndicator时，换symbol后修改benchMark并触发indicator更新事件*/
                            if(window.location.pathname.includes('/myindicator/create')){
                                CIQ.store.set_mi_benchmark(data.symbol)
                            }

                            CIQ.hideCover()
                            CIQ.nprogress.done()
                        });
                        self.input[0].value = "";
                    };
                }

                this.resultList = CIQ.UI.$(this.resultList);
                this.resultList.empty();
                for (let i = 0; i < arr.length; i++) {
                    let item = arr[i];
                    let nodeText = "";
                    //console.log(item.display)
                    for (let j = 0; j < item.display.length; j++) {
                        nodeText += "<SPAN>" + item.display[j] + "</SPAN>";
                    }
                    if(this.currentFilter == 'CUSTOM SYMBOL'){
                        nodeText += "<div class='ciq-icon ciq-close st-close'></div>"
                    }

                    let node = document.createElement("cq-item");
                    node.innerHTML = nodeText;
                    this.resultList.append(node);
                    node.selectFC = closure(this, item.data);
                    CIQ.UI.stxtap(node, node.selectFC);
                }
                var scrollable = this.resultList;
                if (scrollable[0]) scrollable[0].top();
    
                // Reset the hilight position
                this.highlightFocusedItem(this.filterElements);
            }
    
            /**
             * Accepts a new symbol or symbol object.
             *
             * @param {object} data Contains a symbol or symbol object in a form accepted by
             * 		{@link CIQ.ChartEngine#loadChart}.
             * @param {function} fn Function to execute when the callback set by
             * 		[setCallback]{@link WebComponents.cq-lookup#setCallback} finishes.
             *
             * @alias selectItem
             * @memberof WebComponents.cq-lookup#
             * @since 8.2.0 Removed the `params` parameter. Added the `fn` parameter.
             */
        selectItem(data, fn) {
			if (this.params.cb) {
				this.params.cb(data, fn);
			}
		}

            /**
             * Sets a callback function to be called when the user selects a symbol.
             *
             * @param {function} cb The callback function; for example, an implementation of
             * 		{@link CIQ.UI.Context#changeSymbol}.
             *
             * @alias setCallback
             * @memberof WebComponents.cq-lookup#
             */
            setCallback(cb) {
                this.params.cb = cb;
            }
    
            setContext(context) {
                this.initialize();
    
                const symbolInput = this.querySelector("cq-lookup-input input");
                const { config, stx } = context;
                if (!config) return;
                const { channels = {} } = config;
    
                this.channelSubscribe(
                    channels.breakpoint || "channel.breakpoint",
                    (breakPoint) => {
                        var placeholder = stx.crossSection
                            ? stx.crossSection.symbolInputType
                            : "Symbol";
                        if (breakPoint === "break-lg") {
                            placeholder = "Enter " + placeholder;
                        }
                        symbolInput.setAttribute(
                            "placeholder",
                            breakPoint === "break-sm" ? "" : ""
                        );
                    }
                );
    
                // Get a list of filter tabs for keyboard navigation
                this.filterElements = this.querySelectorAll(
                    "cq-lookup-filters cq-filter"
                );
    
                if (!this.params.cb && context.changeSymbol)
                    this.params.cb = context.changeSymbol;
            }
    
            /**
             * Connects a {@link CIQ.ChartEngine.Driver.Lookup} to the web component.
             *
             * The lookup driver searches financial exchanges for symbols that match the text entered
             * in the component's input field.
             *
             * @param {CIQ.ChartEngine.Driver.Lookup} driver The lookup driver to connect to the web
             * 		component.
             *
             * @alias setDriver
             * @memberof WebComponents.cq-lookup#
             */
            setDriver(driver) {
                this.params.driver = driver;
            }
        }
    
        Lookup.markup = `
            <cq-lookup-input cq-no-close>
                <input type="text" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="none" name="symbol" placeholder="">
                <cq-lookup-icon class="cq-lookup-icon"></cq-lookup-icon>
            </cq-lookup-input>
            <cq-lookup-results>
                <cq-lookup-filters cq-no-close>
                <cq-filter class="true">ALL</cq-filter>
                <cq-filter>STOCKS</cq-filter>
                <cq-filter>INDEXES</cq-filter>
                <cq-filter>MY FAVORITES</cq-filter>
                <cq-filter>CUSTOM SYMBOL</cq-filter>
                <div class="overlay">Updating list</div>
                </cq-lookup-filters>
                <cq-uploader cq-no-close></cq-uploader>
                <cq-scroll></cq-scroll>
                <cq-loader class="loaderLookup"></cq-loader>
            </cq-lookup-results>  
        `;
        // <div class="overlay"></div>
        CIQ.UI.addComponentDefinition("cq-lookup", Lookup);
    }
    
    };
export {__js_webcomponents_lookup_}
    
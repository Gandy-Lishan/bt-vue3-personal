import { CIQ as _CIQ, timezoneJS as _timezoneJS } from 'chartiq/js/chartiq.js'
import { formatStandardTime, timestampToTime, timeframeTransform } from '@/utils'
import { printConsole } from '@/utils'
import marker from "./markersSample.js";
import {fetchAISuplineData,stopAllPolling} from '@/service/service'

// 定义global一次性marker,不注册了

let __st_js_marker_drawer_ = _exports => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */

    var CIQ = typeof _CIQ !== 'undefined' ? _CIQ : _exports.CIQ

    /** BacktestEdge通用 */
    // load trade data then render them on chart
    CIQ.loadChart = function(dataSet,callback){
        CIQ.MarkersSample = new marker.MarkersSample(CIQ.stxx)
        CIQ.MarkersSample.loadDataSet(dataSet)
        CIQ.MarkersSample.hideMarkers()
        // // 初始化markerVisibilityType为全部显示
        CIQ.MarkersSample.setMarkerVisibilityType()
        callback()
    }
    CIQ.addMarker = function(){
        CIQ.MarkersSample.showMarkers('mMarker')
    }
    // create and remove buy/sell icon on chart
    CIQ.addPrompt = function(){
        var nodeGreen = document.getElementsByClassName('buy')[0]
        var nodeRed = document.getElementsByClassName('sell')[0]
        nodeGreen.style.display = "block"
        nodeRed.style.display = "block"

        // dual symbol
        var comparisonSymbol = CIQ.store.getters.getComparisonSymbol
        if(comparisonSymbol.url){
            var nodeGreen2 = document.getElementsByClassName('buy_2')[0]
            var nodeRed2 = document.getElementsByClassName('sell_2')[0]
            nodeGreen2.style.display = "block"
            nodeRed2.style.display = "block"
        }

    }
    CIQ.removePrompt = function(){
        for(var node of document.getElementsByClassName('buy')){
            node.style.display = "none"
        }
        for(var node of document.getElementsByClassName('sell')){
            node.style.display = "none"
        }

        // dual symbol
        var comparisonSymbol = CIQ.store.getters.getComparisonSymbol
        if(comparisonSymbol.url){
            for(var node of document.getElementsByClassName('buy_2')){
                node.style.display = "none"
            }
            for(var node of document.getElementsByClassName('sell_2')){
                node.style.display = "none"
            }
        }
    }
    // remove all existing trade markers
    CIQ.hideMarker = function(){
        try{
            CIQ.removePrompt()
            CIQ.MarkersSample.showMarkers()
        }catch(err){}	
    }
    CIQ.setMarkerVisibility = function(type){
        //let markerVisibilityType = type=='buy'? "triangle_buy": "triangle_sell"
        const visibilityTypeMap = {
            'buy': 'triangle_buy',
            'sell': 'triangle_sell',
            'buy_2': 'triangle_buy_2',
            'sell_2': 'triangle_sell_2',
        };
        let markerVisibilityType = visibilityTypeMap[type] || null;

        if(CIQ.MarkersSample) CIQ.MarkersSample.setMarkerVisibilityType(markerVisibilityType)
        if(!CIQ.MarkersSample.activeLabels.includes(markerVisibilityType)){
            CIQ.MarkersSample.showMarkers('mMarker')
        }else{
            CIQ.MarkersSample.setMarkerInvisibe(markerVisibilityType)
        }
    }

    /** CPM page */
    CIQ.createOneTimeScannerMarkerHighLowLine = function(date,name,pionts){
        CIQ.createOneTimePatternMarker(date,name)

        var quotes = CIQ.stxx.chart.dataSet;

        //console.time("🚗 🚗Total execution time");
        // 将 entryTradeDateArr 转换为一个字典（哈希表）
        let piontsDict = {};
        for (let i = 0; i < pionts.length; i++) {
            const standardDate = formatStandardTime(pionts[i].Date).getTime()
            piontsDict[standardDate] = pionts[i];
        }
        for (var i = 0; i < quotes.length; i++) {
            var quote = quotes[i];
            if (quote.DT) {
                var quoteTime = quote.DT.getTime();
                // 使用字典查找对应的 pionts 对象
                const matchingPoint = piontsDict[quoteTime];
                if (matchingPoint) {
                    // 根据 PointType 确定 y 轴的值
                    let yAxis = matchingPoint.PointType === 'High' ? quote.High : quote.Low;
                    // 添加study panel对应的小点
                    new CIQ.Marker({
                        stx: CIQ.stxx,
                        xPositioner: "date",
                        yPositioner: "value",
                        y:yAxis,
                        x: quote.DT,
                        label: "dot",
                        node: new CIQ.Marker.stPerformance({
                            type: "circle",
                            category: 'highlowline',
                            displayCategory: false,
                            displayStem: false,	
                        })
                    });
                }
            }
        }
        // console.timeEnd("🚗 🚗Total execution time");
        CIQ.stxx.draw();
    }
    CIQ.createOneTimeScannerMarkerHammer = function(trades,date,signal){	
        CIQ.createOneTimePatternMarker(date,signal)

        // 显示trade study标记
        var newNode;
        var quotes = CIQ.stxx.chart.dataSet;
        //console.time("🚗 🚗Total execution time");
        // 将 entryTradeDateArr 转换为一个字典（哈希表）
        let entryTradeDateArr = eval('(' + trades + ')')
        let entryTradeDateDict = {};
        if(entryTradeDateArr){
            for (let i = 0; i < entryTradeDateArr.length; i++) {
                const standardDate = formatStandardTime(entryTradeDateArr[i]).getTime()
                entryTradeDateDict[standardDate] = true;
            }
        }

        for (var i = 0; i < quotes.length; i++) {
            var quote = quotes[i];
            if (quote.DT) {
                var quoteTime = quote.DT.getTime();

                // 使用字典来查找
                if (entryTradeDateDict[quoteTime]) {
                    newNode = document.querySelector("#stxMessage").cloneNode(true);
                    newNode.id = null;
                    newNode.innerHTML = signal;

                    // hammer显示在进场前一天
                    new CIQ.Marker({
                        stx: CIQ.stxx,
                        xPositioner: "date",
                        x: quotes[i - 1].DT,
                        label: "events",
                        node: newNode
                    });
                }
            }
        }
        //console.timeEnd("🚗 🚗Total execution time");
        CIQ.stxx.draw();
    }
    CIQ.createOneTimeLastSignalMarker = function(date,content,comparisonSymbolUrl){
        //hoverable marker
        const standardDate = formatStandardTime(date)


        let params
        if(comparisonSymbolUrl){
            params = {
                stx: CIQ.stxx,
                xPositioner: "date",
                plotField: comparisonSymbolUrl,		// <<<<== custom field
                x: standardDate,
                label: "events",
                node: new CIQ.Marker.stPerformance({
                    type: "last-signal",
                    headline: `The Last Signal From Symbol ${comparisonSymbolUrl}`,
                    category: 'last-signal',
                    displayCategory: true,
                    displayStem: false,	
                })
            }
        }else{
            params = {
                stx: CIQ.stxx,
                xPositioner: "date",
                x: standardDate,
                label: "events",
                node: new CIQ.Marker.stPerformance({
                    type: "last-signal",
                    headline: `The Last Signal From Symbol ${CIQ.stxx.chart.symbol}`,
                    category: 'last-signal',
                    displayCategory: true,
                    displayStem: false,	
                })
            }
        }
        new CIQ.Marker(params);
    }
    CIQ.createOneTimePatternMarker = function(date,content){
        //CIQ.hideMarker()
        CIQ.store.dispatch('states/set_isMarkerShown_flag',false)
        // 显示pattern标记
        var newNode;
        
        //hoverable marker
        const standardDate = formatStandardTime(date)

        newNode = document.querySelector("#stxEventHover").cloneNode(true);
        newNode.id = null;
        newNode.querySelector(".tooltip").innerHTML = `
            <div>${content}</div>
        `
        newNode.classList.add("hoverMarker");
        new CIQ.Marker({
            stx: CIQ.stxx,
            xPositioner: "date",
            x: standardDate,
            label: "events",
            node: newNode
        });
        CIQ.stxx.draw()
    }
    CIQ.createCorrelationPatternMatchDrawing = function(dataSet, type, numOfBars){
        // CIQ.Drawing.rectangle.prototype.intersected = function (tick, value, box) {
        //     if (!this.p0 || !this.p1) return null; // in case invalid drawing (such as from panel that no longer exists)
        //     var pointsToCheck = { 0: this.p0, 1: this.p1 };
        //     for (var pt in pointsToCheck) {
        //         if (
        //             this.pointIntersection(pointsToCheck[pt][0], pointsToCheck[pt][1], box)
        //         ) {
        //             this.highlighted = "p" + pt;
        //             return {
        //                 action: "drag",
        //                 point: "p" + pt
        //             };
        //         }
        //     }
        //     if (this.boxIntersection(tick, value, box)) {
        //         this.highlighted = true;
        //         var mSticky = CIQ.stxx.controls.mSticky;
        //         var mStickyInterior = mSticky && mSticky.querySelector(".mStickyInterior");
        //         if (mStickyInterior) {
        //             // var lines = [];
        //             // lines.push(stx.translateIf(CIQ.capitalize(this.name)));
        //             // if (this.getYValue)
        //             //     lines.push(
        //             //         stx.translateIf(this.field || stx.defaultPlotField || "Close")
        //             //     );
        //             // lines.push(mStickyInterior.innerHTML);
        //             mStickyInterior.innerHTML = `startDate: ${this.d0.slice(0,8)} </br>endDate: ${this.d1.slice(0,8)}`;
        //         }
        //         return {
        //             action: "move",
        //             p0: CIQ.clone(this.p0),
        //             p1: CIQ.clone(this.p1),
        //             tick: tick,
        //             value: value
        //         };
        //     }
        //     return null;
        // };


        // Set all drawings to permanent
        CIQ.Drawing.prototype.permanent = true;    
        let quotes
        if(type == 'scannerai'){
            quotes = pairDatesScanner(dataSet,numOfBars)
        }
        else if(type == 'cpm'){
            quotes = pairDatesCPM(dataSet)
        }
        //const yAxis = CIQ.stxx.chart.yAxis    
        //const offset = (yAxis.high-yAxis.low)/4            // 依据Y轴长度设定的偏移量，以保证模式匹配阴影覆盖整个高度
        
        // // from: https://documentation.chartiq.com/CIQ.ChartEngine.html#importDrawings
        // // Programmatically add a rectangle.
        // let drawingList = quotes.map(item => {
        //     return {
        //         name: "rectangle",
        //         pnl: "chart",
        //         col: "transparent",
        //         fc: "#7DA6F5",
        //         ptrn: "solid",
        //         lw: 1.1,
        //         d0: CIQ.yyyymmddhhmmssmmm(new Date(item[0])),
        //         d1: CIQ.yyyymmddhhmmssmmm(new Date(item[1])),
        //         tzo0: 300,
        //         tzo1: 300,
        //         v0: 4593.5508906882591,
        //         v1: 4436.3385829959514,
        //     }
        // })
        // CIQ.stxx.importDrawings(drawingList);
        // // Now render the reconstructed drawings.
        // CIQ.stxx.draw();
    
    
    
        //from: https://documentation.chartiq.com/tutorial-Using%20and%20Customizing%20Drawing%20Tools.html, similar to (DrawingEdit.prototype.clone)
        // define or retrieve the parameters for the drawing
    
        //create factory for the drawing you want
       quotes.forEach(item => { 
            var d0 = formatStandardTime(item[0])
            var d1 = formatStandardTime(item[1])

            // printConsole('**********************')
            // printConsole(d0,d1)
            // printConsole(CIQ.yyyymmddhhmmssmmm(d0),CIQ.yyyymmddhhmmssmmm(d1))

            let drawing = {
                name: "rectangle",
                pnl: "chart",
                col: "transparent",
                fc: "#7DA6F5",
                ptrn: "solid",
                lw: 1.1,
                d0: CIQ.yyyymmddhhmmssmmm(d0),
                d1: CIQ.yyyymmddhhmmssmmm(d1),
                // tzo0: 300,
                // tzo1: 300,
                v0: 100000000,
                v1: -100000000,
            }
            var Factory = CIQ.Drawing[drawing.name];
    
            //create an empty template for that drawing
            var newDrawing = new Factory();
        
            // build the drawing from the parameters
            newDrawing.reconstruct(CIQ.stxx, drawing);
        
            // add it to the chart
            CIQ.stxx.addDrawing(newDrawing);
        })
        //signal the chart that a drawing has been added...so you can save the layout if you want.
        CIQ.stxx.changeOccurred("vector");
        // draw the chart to display it.
        CIQ.stxx.draw();
    }
    CIQ.createCPMMarker = function(dataSet){
        let quotes = pairDatesCPM(dataSet)
        quotes.forEach(item => { 
            // 显示pattern标记
            var newNode;
            //hoverable marker
            const standardDate = formatStandardTime(item[1])
            newNode = document.querySelector("#stxEventHover").cloneNode(true);
            newNode.id = null;
            newNode.querySelector(".tooltip").innerHTML = `
                <div>Start Date: ${item[0]}</div>
                <div>End Date: ${item[1]}</div>
                <div>Correlation: ${item[2]}%</div>
            `;
            newNode.classList.add("hoverMarker");
            new CIQ.Marker({
                stx: CIQ.stxx,
                xPositioner: "date",
                x: standardDate,
                label: "events",
                node: newNode
            });
        })
        CIQ.stxx.draw()
    }
    function pairDatesScanner(arr,numOfBars) {
        const endDateArr = arr;

        // 创建新的配对数组
        const pairArray = endDateArr.map((endDate) => {
            let startDate = CIQ.getStartDateByNumberOfBars(endDate,numOfBars)
            if (startDate) {
                return [startDate, endDate];
            }
            return null;
        }).filter(pair => pair !== null);;
        debugger
        return pairArray;
    }
    function pairDatesCPM(obj) {
        const startDateArr = obj['Start Date'];
        const endDateArr = obj['End Date'];
        const corrArr = obj['Correlation Percentage']

        // 确保 Start Date 和 End Date 数组长度相同
        if (startDateArr.length !== endDateArr.length) {
            throw new Error('Start Date and End Date arrays must have the same length');
        }

        // 创建新的配对数组
        const pairArray = startDateArr.map((startDate, index) => {
            return [startDate, endDateArr[index], corrArr[index]];
        });

        return pairArray;
    }

    /** Report page */
    CIQ.createForecastMarker = async function(){
        const list = await CIQ.store.dispatch('chart/get_forecast',CIQ.stxx.chart.symbol)
        await CIQ.store.dispatch('chart/get_forecast_author_list',[...new Set(list.map(item=>item.author))])
        const bullishList = list.filter(i=>i.forecast == 'Up')
        const bearishList = list.filter(i=>i.forecast == 'Down')

            for (var i = 0; i < bullishList.length; i++) {
                const {post_date,title,url,author,timeframe} = bullishList[i]
                var newNode;
                var post_date_str = post_date.slice(0,10)
                const standardDate = formatStandardTime(post_date_str)
                    newNode = document.querySelector("#stxForecast").cloneNode(true);
                    newNode.id = null;
                    newNode.classList.add('bullish')
                    newNode.setAttribute('data-market', "bullish");
                    newNode.setAttribute('data-author', author);
                    newNode.setAttribute('data-timeframe', timeframe);
                    newNode.innerHTML = `
                    <div>
                        <div class="forecast__marker-background"></div>
                        <div class="forecast__marker-stem"></div>
                        <div class="forecast__marker-tooltip">
                            <h3>${title}</h3>
                            <div style="overflow: hidden">
                                <p>${post_date_str} | ${author}</p><p>${timeframe}</p>
                                <a href=${url} target="_blank">Click to read report</a>
                            </div>
                        </div>
                    </div>`;
                                        
                    new CIQ.Marker({
                        stx: CIQ.stxx,
                        xPositioner: "date",
                        yPositioner: "below_candle",
                        x: standardDate,
                        label: "bullish",
                        node: newNode
                    });
            }


            for (var i = 0; i < bearishList.length; i++) {
                const {post_date,title,url,author,timeframe} = bearishList[i]
                let newNode;
                var post_date_str = post_date.slice(0,10)
                const standardDate = formatStandardTime(post_date_str)
                    newNode = document.querySelector("#stxForecast").cloneNode(true);
                    newNode.id = null;
                    newNode.classList.add('bearish')
                    newNode.setAttribute('data-market', "bearish");
                    newNode.setAttribute('data-author', author);
                    newNode.setAttribute('data-timeframe', timeframe);
                    newNode.innerHTML = `
                    <div>
                        <div class="forecast__marker-background"></div>
                        <div class="forecast__marker-stem"></div>
                        <div class="forecast__marker-tooltip">
                            <h3>${title}</h3>
                            <div style="overflow: hidden">
                                <p>${post_date_str} | ${author}</p><p>${timeframe}</p>
                                <a href=${url} target="_blank">Click to read report</a>
                            </div>
                        </div>
                    </div>`;
            
                    new CIQ.Marker({
                        stx: CIQ.stxx,
                        xPositioner: "date",
                        x: standardDate,
                        label: "bearish",
                        node: newNode
                    });
            }

        CIQ.stxx.draw()
    }
    CIQ.removeForecastMarker = async function(){
        console.log('removeForecastMarker')
        CIQ.Marker.removeByLabel(CIQ.stxx, 'bullish');
        CIQ.Marker.removeByLabel(CIQ.stxx, 'bearish');
    }

    // Draw support line and parallel channel
    CIQ.createSupportLineWithChannelDrawing = function(data){
        // manage all drawing objects
        let drawingObjList = []

        const support_line = data.drawing_instructions.trend_channel[0]['points']
        const resistance_line = data.drawing_instructions.trend_channel[1]['points']
        const horizontal_levels = data.drawing_instructions.horizontal_levels

        // Set all drawings to permanent
        CIQ.Drawing.prototype.permanent = true;  

        //from: https://documentation.chartiq.com/tutorial-Using%20and%20Customizing%20Drawing%20Tools.html, similar to (DrawingEdit.prototype.clone)
        // define or retrieve the parameters for the drawing
    
        //create factory for the drawing you want
        for (let i = 0; i < support_line.length - 1; i++) {
            const p1 = support_line[i];
            const p2 = support_line[i + 1];
            
            var d0 = formatStandardTime(p1.date)
            var d1 = formatStandardTime(p2.date)
            let drawing = {
                name: "continuous",
                pnl: "chart",
                col: "#8cc176",
                fc: "#7DA6F5",
                ptrn: "solid",
                lw: 1.8,
                d0: CIQ.yyyymmddhhmmssmmm(d0),
                d1: CIQ.yyyymmddhhmmssmmm(d1),
                // tzo0: 300,
                // tzo1: 300,
                v0: p1.price,
                v1: p2.price,
            }
            var Factory = CIQ.Drawing[drawing.name];
    
            //create an empty template for that drawing
            var newDrawing = new Factory();
        
            // build the drawing from the parameters
            newDrawing.reconstruct(CIQ.stxx, drawing);
        
            // add it to the chart
            CIQ.stxx.addDrawing(newDrawing);

            drawingObjList.push(newDrawing)
        }

        for (let i = 0; i < resistance_line.length - 1; i++) {
            const p1 = resistance_line[i];
            const p2 = resistance_line[i + 1];
            
            var d0 = formatStandardTime(p1.date)
            var d1 = formatStandardTime(p2.date)
            let drawing = {
                name: "continuous",
                pnl: "chart",
                col: "#b82d0c",
                fc: "#7DA6F5",
                ptrn: "solid",
                lw: 1.8,
                d0: CIQ.yyyymmddhhmmssmmm(d0),
                d1: CIQ.yyyymmddhhmmssmmm(d1),
                // tzo0: 300,
                // tzo1: 300,
                v0: p1.price,
                v1: p2.price,
                text: 'hello',
                fontSize: '18px',
                fontString: 'normal 300 18px Helvetica'
            }
            var Factory = CIQ.Drawing[drawing.name];
    
            //create an empty template for that drawing
            var newDrawing = new Factory();
        
            // build the drawing from the parameters
            newDrawing.reconstruct(CIQ.stxx, drawing);
        
            // add it to the chart
            CIQ.stxx.addDrawing(newDrawing);

            drawingObjList.push(newDrawing)
        }

        horizontal_levels.forEach(item => {  
            var d0 = formatStandardTime('2025-08-10')
            var d1 = formatStandardTime('2025-08-15')
            let drawing = {
                name: "line",
                pnl: "chart",
                col: item.type == 'resistance' ? "#b82d0c" : "#8cc176",
                fc: "#7DA6F5",
                ptrn: "dashed",
                lw: 1.2,
                d0: CIQ.yyyymmddhhmmssmmm(d0),
                d1: CIQ.yyyymmddhhmmssmmm(d1),
                // tzo0: 300,
                // tzo1: 300,
                v0: item.price,
                v1: item.price,
            }
            var Factory = CIQ.Drawing[drawing.name];
    
            //create an empty template for that drawing
            var newDrawing = new Factory();
        
            // build the drawing from the parameters
            newDrawing.reconstruct(CIQ.stxx, drawing);
        
            // add it to the chart
            CIQ.stxx.addDrawing(newDrawing);

            drawingObjList.push(newDrawing)
        })
        horizontal_levels.forEach(item => { 
            CIQ.createOneTimeHorizontalLabelMarker(item)
            // // append annotation
            // var d0 = formatStandardTime('2025-08-15')
            // let drawing = {
            //     name: "annotation",
            //     d0: CIQ.yyyymmddhhmmssmmm(d0),
            //     pnl: "chart",
            //     col: item.type == 'resistance' ? "#00746a" : "#398BFF",
            //     fc: "#7DA6F5",
            //     // p0: [24500, item.price],
            //     // p1: [24520, item.price],
            //     // tzo0: 300,
            //     v0: item.price,
            //     text: 'hello@@@@@@@@',
            //     fontSize: '18px',
            //     fontString: 'normal 300 18px Helvetica',
            //     w: 350.6,
            //     h: 210,
            //     padding: 4,
            // }
            // var Factory = CIQ.Drawing[drawing.name];

            // //create an empty template for that drawing
            // var newDrawing = new Factory();

            // // build the drawing from the parameters
            // newDrawing.reconstruct(CIQ.stxx, drawing);
            // // newDrawing.boxToPixels(CIQ.stxx, "chart", {
            // //     x0: 240,
            // //     y0: item.price,
            // //     x1: 270,
            // //     y1: item.price,
            // // })
            // // add it to the chart
            // CIQ.stxx.addDrawing(newDrawing);
        })

        //signal the chart that a drawing has been added...so you can save the layout if you want.
        CIQ.stxx.changeOccurred("vector");
        // draw the chart to display it.
        CIQ.stxx.draw();

        return drawingObjList
    }
    CIQ.createOneTimeHorizontalLabelMarker = function(item){
        var newNode;
        
        //hoverable marker
        newNode = document.querySelector("#stxHorizontalLabel").cloneNode(true);
        newNode.id = null;
        newNode.innerHTML = `
            <div style="font-size: 12px;font-weight: 400;color:${item.type == 'resistance' ? '#b82d0c' : '#8cc176'}">${item.label}</div>
        `

        new CIQ.Marker({
            stx: CIQ.stxx,
            x: new Date(),
            xPositioner: "none",
            yPositioner: "value",
            y: item.price,
            label: "horizontalLabel",
            node: newNode
        });
        CIQ.stxx.draw()
    }

    CIQ.updateSupportLineWithChannelDrawing = async function(vm){
        return new Promise(async (resolve, reject) => {
            var mNode = document.getElementById('ai-supline')
            // 改为判断图表是否存在绘制的图形（CIQ.store.getters.getDrawingObjList）
            const drawingObjList = CIQ.store.getters.getDrawingObjList
            if(drawingObjList && drawingObjList.length == 0) {
                // 添加active后需要获取数据源，失败则移除active
                try {
                    clearDrawing()
                    const curDate = new Date()
                    const freq = timeframeTransform(CIQ.store.state.form.pairDataFreq)
                    const res = await fetchAISuplineData(vm, CIQ.stxx.chart.symbol || 'SPX', timestampToTime(curDate), freq)
                    let drawingObjList = CIQ.createSupportLineWithChannelDrawing(res)
                    CIQ.store.dispatch('chart/set_drawing_objlist', drawingObjList)
                    if(mNode) mNode.classList.add('active')
                    resolve('AI Support Line Appended')
                } catch (error) {
                    console.error(error)
                    reject(error)
                }	
            } else {
                try {
                    console.log('remove ai supline')
                    resolve('AI Support Line Removed')
                    clearDrawing()
                    CIQ.store.dispatch('chart/set_drawing_objlist', [])
                    if(mNode) mNode.classList.remove('active')
                } catch (error) {
                    reject("Failed to remove AI Support Line");
                }
            }
        })
    }

    CIQ.resetSupportLineWithChannel = function(){
        var mNode = document.getElementById('ai-supline')
        console.log('reset ai supline state')
        stopAllPolling()
        clearDrawing()
        CIQ.store.dispatch('chart/set_drawing_objlist', [])
        if(mNode) mNode.classList.remove('active')
    }

    const clearDrawing = function() {
        CIQ.Marker.removeByLabel(CIQ.stxx, 'horizontalLabel');
        const drawingObjList = CIQ.store.getters.getDrawingObjList
        if(drawingObjList.length > 0) {
            for(var i in drawingObjList) {
                CIQ.stxx.removeDrawing(drawingObjList[i])
            }
        }
    }
}

export { __st_js_marker_drawer_ }
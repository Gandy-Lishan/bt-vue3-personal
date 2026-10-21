import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";

// 一些共用工具函数，可以分离出来
let __st_js_manage_chart_layout_ = (_exports) => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

    CIQ.saveLayout = function(name) {
        let stx = CIQ.stxx
        var layout = JSON.stringify(CIQ.stxx.exportLayout(true));
        let layoutFreq = CIQ.store.state.form.exitFrequency
        let chartType = stx.layout.chartType
        let uid = crypto.randomUUID()
        let pref = savePreferences()
        let themes = document.querySelector("cq-context").classList.value.indexOf("ciq-night") != -1 ? 'night' : 'day'
        
        let customizedLayouts = {}
        customizedLayouts.headsUp = stx.layout.headsUp
        customizedLayouts.lastPriceLabel = stx.layout.lastPriceLabel
        customizedLayouts.xAixsGridLine = stx.layout.xAixsGridLine
        customizedLayouts.crosshair = stx.layout.crosshair

        let comparison = JSON.stringify(CIQ.store.getters.getComparisonSymbol) || ''

        // symbol ohlcv的roc计算函数需要用到Layout
        let activatedMALayout = JSON.stringify(CIQ.store.state.chart.activatedMALayout) || '[]'

        let obj = {id:uid,name,layout,layoutFreq,chartType,pref,themes,customizedLayouts,comparison, activatedMALayout}
        return obj
    }
    
    const savePreferences = function() {
        var preferences = JSON.stringify(CIQ.stxx.exportPreferences());
        return preferences
        // localStorage.setItem("myChartPreferences", preferences);
    }
    
    const saveDrawings = function() {
        var drawings = JSON.stringify(CIQ.stxx.exportDrawings());
    
        //saves drawings with symbol as the key
        localStorage.setItem(CIQ.stxx.chart.symbol, drawings);
    }

    CIQ.restoreLayout = async function(layout) {
        var importOptions = {
            managePeriodicity: true,
            preserveTicksAndCandleWidth: true
        };
        if (layout) {
            CIQ.addCover()
            CIQ.store.commit('form/getFrequency', layout.layoutFreq)
            CIQ.store.dispatch('chart/set_chart_type', layout.chartType)
            CIQ.store.commit('chart/getMALayout', JSON.parse(layout.activatedMALayout || '[]'))
            CIQ.isRestoreLayout = true   
            let parsedLayout = JSON.parse(layout.layout)
            parsedLayout.symbols[0].symbolObject.endDate = new Date().toISOString()
            CIQ.stxx.importLayout(parsedLayout, {
                ...importOptions, // This includes any other options you might have
                cb: async () => {
                    restorePreferences(layout.pref)
                    restoreThemes(CIQ.stxx, layout.themes)
                    restoreCustomizedLayouts(CIQ.stxx, layout.customizedLayouts)
                    await restoreComparison(CIQ.stxx, layout.comparison, () => {});
                    CIQ.hideCover()
                }
            });           
        }
    }
    
    const restorePreferences = function(pref) {
        CIQ.stxx.importPreferences(JSON.parse(pref));
    }
    
    const restoreCustomizedLayouts = function(stx, customizedLayouts) {
        stx.layout.headsUp = customizedLayouts.headsUp;
		
        // lastPriceLabel, 同componentUI Line3866
		stx.layout.lastPriceLabel = customizedLayouts.lastPriceLabel;
        var mNode = document.getElementsByClassName('lastP')[0]
        if (stx.layout.lastPriceLabel) {
			mNode.classList.add('active')
			stx.chart.yAxis.drawCurrentPriceLabel = true
		} else {
			mNode.classList.remove('active')
			stx.chart.yAxis.drawCurrentPriceLabel = false
		}

		stx.layout.xAixsGridLine = customizedLayouts.xAixsGridLine
        var mNode = document.getElementsByClassName('grid')[0]
		if (stx.layout.xAixsGridLine) {
			mNode.classList.add('active')
			stx.chart.yAxis.displayGridLines = true
			stx.chart.xAxis.displayGridLines = true
		} else {
			mNode.classList.remove('active')
			stx.chart.yAxis.displayGridLines = false
			stx.chart.xAxis.displayGridLines = false
		}

		stx.layout.crosshair = customizedLayouts.crosshair;

		stx.changeOccurred("layout");
		stx.draw();
    }

    const restoreComparison = async function(stx, comparison,cb) {
        debugger
        CIQ.store.commit('form/setComparisonSymbol', JSON.parse(comparison))
        // addSeire前移除当前序列,防止出现多个序列
        for(var s in stx.chart.series){
            var series=stx.chart.series[s];
            stx.removeSeries(series);
        }
        await CIQ.addComparison(stx, JSON.parse(comparison), cb)
    }

    const restoreThemes = function(stxx, themes) {
        // clear out the old styles to allow new ones to be cached in; and redraw.
        if(themes == 'day') {
            document.querySelector("cq-context").classList.remove('ciq-night');
            stxx.styles={};stxx.draw();
        }else if(themes == 'night') {
            document.querySelector("cq-context").classList.add('ciq-night');
            stxx.styles={};stxx.draw();
        }
    }

    const restoreDrawings = function() {
        var drawings = localStorage.getItem(CIQ.stxx.chart.symbol);
        if (drawings) CIQ.stxx.importDrawings(JSON.parse(drawings));
    }

    // 检查 URL 中是否有 layoutId，如果有则返回 layoutId，否则返回 null
    // 注意：这个函数只检查 URL，不加载数据。数据加载需要在外部通过 API 完成
    CIQ.checkLayoutIdInUrl = function() {
        const urlParams = new URLSearchParams(window.location.search)
        const layoutId = urlParams.get('layoutId')
        
        if (layoutId) {
            return { layoutId }
        }
        return null
    }
    
    // 使用 API 获取到的 layout 数据恢复图表
    // 这个函数应该在外部 API 调用成功后执行
    CIQ.restoreLayoutFromAPI = function(layoutData) {
        if (!layoutData) {
            console.error('No layout data provided')
            return false
        }
        
        try {
            // 直接恢复 layout，CIQ.restoreLayout 内部会处理 symbol 切换
            CIQ.restoreLayout(JSON.parse(layoutData))
            return true
        } catch (error) {
            console.error('Failed to restore layout from API:', error)
            return false
        }
    }
}

export { __st_js_manage_chart_layout_ }
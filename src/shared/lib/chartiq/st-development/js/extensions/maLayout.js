import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";

// 封装ma状态保存函数
let __st_js_maLayout_ = (_exports) => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    /**
     * 和setMALayout独立开，用url和criteria管理Tech（ma类除外）和SymbolOhlcv的图表定位信息
     * 不含ma类的tech以及symbol不加critria和index， 因为他们同一symbol下只显示一个，用不上这两个属性
     * @param {*} url 
     * @param {*} criteria 用来判断symbol
     * @returns symbol
     */
    CIQ.setTechLayout = function (url, criteria, index) {
        // /** 根据critial判断study所属Symbol */
        // let isComparison = (criteria && criteria.endsWith('2')) || false

        var activatedTechLayoutList = CIQ.store.state.chart.activatedTechLayout?CIQ.store.state.chart.activatedTechLayout:[]

        // 移除当前位置的indicator信息
        var TechLayoutListIndex = activatedTechLayoutList.findIndex(
            // 防止没法加载多个builtin tech from chart
            (item) => (criteria != null && index != null) && item.criteria == criteria && item.index == index
        )
        if (TechLayoutListIndex != -1) {
            activatedTechLayoutList.splice(TechLayoutListIndex, 1)
        }
        
        if (!CIQ.store.getters.getMaLikeTech.includes(url) && (CIQ.findBuiltinTechIndicator(null,url) || CIQ.findSymbolIndicator(url,null))){
            var obj = {}
            // 如果存在dual symbol两个symbol共用同一个tech indicator,则分别保存其信息
            obj = {
                url: url,
                //isComparison: isComparison, // 新加了一个isComparison属性，专门用来判断是否归属symbol2，而不是用criteria判断
                /**
                 * 不用考虑symbolOHLCV而加入field属性，因为我把symbolOhlcv分成了5个不同Study,每个都有其默认Field
                 */
                /**
                 * 还是得考虑这两个位置坐标，主要是tech更换时它需要参与判断,但是不会加入到study的parameters里面干扰csv的生成
                 * （SPY）MACD, (AAPL) MACD => （SPY）RSI, (AAPL) MACD
                 */
                criteria: criteria,
                index: index
            }

            // 如果列表存在同symbol下的同名indicator, 则跳过保存
            // if(!(activatedTechLayoutList.find(item=>
            //     item.url == obj.url && 
            //     ((item.criteria.endsWith("2")&&obj.criteria.endsWith("2")) || (!item.criteria.endsWith("2")&&!obj.criteria.endsWith("2")))
            //     ))) {
                activatedTechLayoutList.push(obj)
           // }      
        }
        CIQ.store.commit('chart/getTechLayout', activatedTechLayoutList)
    }

    CIQ.removeTechLayout = function (url, criteria, index) {
        // /** 根据critial判断study所属Symbol */
        // let isComparison = (criteria && criteria.endsWith('2')) || false
        if (!CIQ.store.getters.getMaLikeTech.includes(url) && (CIQ.findBuiltinTechIndicator(null,url) || CIQ.findSymbolIndicator(url,null))){
            // 對undefined的判斷處理只是爲了防止報錯，因爲btv1的遷移可能存在未知的錯誤
            var activatedTechLayoutList = CIQ.store.state.chart.activatedTechLayout?CIQ.store.state.chart.activatedTechLayout:[]

            // remove redundant Tech
            var TechLayoutListIndex = activatedTechLayoutList.findIndex(
                (item) => item.criteria == criteria && item.index == index
            )
            if (TechLayoutListIndex != -1) {
                activatedTechLayoutList.splice(TechLayoutListIndex, 1)
            }

            CIQ.store.commit('chart/getTechLayout', activatedTechLayoutList)
        }
    }



    CIQ.setMALayout = function (url, criteria, index, {
        period = null,
        type = null,
        field = null,
        ticker = null
    } = {}) {
        var activatedMALayoutList = CIQ.store.state.chart.activatedMALayout?CIQ.store.state.chart.activatedMALayout:[]
        // remove a MA tat already exists in current criteria
        var MALayoutListIndex = activatedMALayoutList.findIndex(
            (item) => item.criteria == criteria && item.index == index
        )
        if (
            (criteria || index) &&  // 替代现存MA时不能把extra studies里的MA替换掉
            MALayoutListIndex != -1
        ) {
            activatedMALayoutList.splice(MALayoutListIndex, 1)
        }
        if (CIQ.store.getters.getMaLikeTech.includes(url)){
            // keep current MA
            var objMA = url == 'ma' 
            ? {
                url: url,
                period: period ? period : 21,
                type: type ? type : 'simple',
                field: field ? field : 'Close',
                criteria: criteria,
                index: index
            }
            : { //预留给其他ma类型的tech, 目前就一个ma
                url: url,
                ticker: ticker, 
                criteria: criteria,
                index: index
            }
            activatedMALayoutList.push(objMA)
        }
        CIQ.store.commit('chart/getMALayout', activatedMALayoutList)
    }
    CIQ.removeMALayout = function (url, criteria, index) {
        if (CIQ.store.getters.getMaLikeTech.includes(url)) {
            // 對undefined的判斷處理只是爲了防止報錯，因爲btv1的遷移可能存在未知的錯誤
            var activatedMALayoutList = CIQ.store.state.chart.activatedMALayout?CIQ.store.state.chart.activatedMALayout:[]

            // remove current MA attached to an indicator
            var MALayoutListIndex = activatedMALayoutList.findIndex(
                (item) => item.criteria == criteria && item.index == index
            )
            if (MALayoutListIndex != -1) {
                activatedMALayoutList.splice(MALayoutListIndex, 1)
            }

            CIQ.store.commit('chart/getMALayout', activatedMALayoutList)
        }
    }
    // 用于changeRelation relation==1
    CIQ.keepTheFirstMALayout = function (criteria) {

        var activatedMALayoutList = CIQ.store.state.chart.activatedMALayout?CIQ.store.state.chart.activatedMALayout:[]

        // 如tech是ma则保留第一个选项卡的ma信息
        activatedMALayoutList = activatedMALayoutList.filter(
            (item) => item.criteria != criteria || (item.criteria == criteria && item.index == 0)
        )

        CIQ.store.commit('chart/getMALayout', activatedMALayoutList)

        /**
         * 同时更新techLayout位置
         */
        var activatedTechLayoutList = CIQ.store.state.chart.activatedTechLayout?CIQ.store.state.chart.activatedTechLayout:[]

        // 如tech是ma则保留第一个选项卡的ma信息
        var activatedTechLayoutList = activatedTechLayoutList.filter(
            (item) => item.criteria != criteria || (item.criteria == criteria && item.index == 0)
        )

        CIQ.store.commit('chart/getTechLayout', activatedTechLayoutList)
    }
    // 用于changeRelation relation==0
    CIQ.removeExitMALayout = function () {
        var activatedMALayoutList = CIQ.store.state.chart.activatedMALayout?CIQ.store.state.chart.activatedMALayout:[]

        // 如tech是ma则保留第一个选项卡的ma信息
        activatedMALayoutList = activatedMALayoutList.filter(
            (item) => ['entry', 'entry2'].includes(item.criteria)
        )

        CIQ.store.commit('chart/getMALayout', activatedMALayoutList)
    }
}
export { __st_js_maLayout_ }
/**
 *	2.2.0
 *	contains customized functions related to indicator loading and CSV output file generation
 */
 import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
 
 /** 独立出的cpm对于chartiq的控制函数，考虑到它并没有很依赖loadIndicator.js */

 let __st_js_cpm_chart_control_ = (_exports) => {
 /* global _CIQ, _timezoneJS, _SplinePlotter */
 
 var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    // CPM暂时放这
    CIQ.displayCPMLayout = async function(chart_data,cb){
        let symbol =  chart_data.symbol
        let timeframe = chart_data.timeframe

        CIQ.addCover()
        //CIQ.store.commit('states/SET_MI_CREATE_LOADING', true)
        CIQ.store.commit('form/getFrequency', timeframe) //考虑到addSeries必须写死timeframe
        CIQ.store.commit('form/getBacktestSymbol', symbol)
        CIQ.stxx.loadChart({ 
                symbol: symbol, 
                // 这边先写死范围，防止其他indicator无法pagination
                startDate:new Date(parseInt(process.env.VUE_APP_START_DATE)),endDate:new Date(),
            },
            function () {
                // 有result的情况下(success)执行此回调并计算TIM
                if(chart_data.result){
                    CIQ.createCorrelationPatternMatchDrawing(chart_data.result, 'cpm')
                    CIQ.createCPMMarker(chart_data.result)
                    cb()
                }

                CIQ.hideCover()
                CIQ.nprogress.done()
                //CIQ.store.commit('states/SET_MI_CREATE_LOADING', false)
            }
        ) 
    }
    CIQ.drawCPMMA = function(period) {

			for (var studyInstanceName in CIQ.stxx.layout.studies) {
				var sd = CIQ.stxx.layout.studies[studyInstanceName]
				if (
					sd.type == 'ma' && sd.panel == 'chart'
				) {
					CIQ.Studies.replaceStudy(CIQ.stxx, sd.inputs.id, sd.type, {
                        Period: period,
                        Field: sd.inputs.Field,
                        Offset: 0
                    })
                    return
				}
                
			}			

        CIQ.Studies.addStudy(CIQ.stxx, "ma",{
            Period: period,
            Field: "Close"
        });
    }
    CIQ.removeCPMMA = function() {
        for (var studyInstanceName in CIQ.stxx.layout.studies) {
            var sd = CIQ.stxx.layout.studies[studyInstanceName]
            if (
                sd.type == 'ma' && sd.panel == 'chart'
            ) {
                CIQ.Studies.removeStudy(
                    CIQ.stxx,
                    sd
                )
            }
            
        }			
    }
 }
 export {__st_js_cpm_chart_control_}
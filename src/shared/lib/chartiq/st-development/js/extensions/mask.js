/**
 *	2.2.0
 *	add a mask on screen during loading
 */
 import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
 import store from '@/store'



 let __st_js_mask_ = (_exports) => {
 
 /* global _CIQ, _timezoneJS, _SplinePlotter */
 
 var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

CIQ.addCover = function coverDiv(content='loading'){   
    // let coverList = document.getElementsByClassName('mybg')
    // if(coverList.length!=0){
    //     //console.log('mask already exist,change text on mask by instead',content)
    //     if(content) CIQ.setCoverText(content)
    //     return
    // }
    
    // var procbg = document.createElement("div");
    // let cont = content?content:"the chart is loading, it might take a few seconds..."
    // procbg.innerHTML = "<div class='el-loading-spinner'><i class='el-icon-loading' style='font-size:35px'></i><p class='el-loading-text' style='font-size:18px;margin: 22px 0;'>"+ cont +"</p></div>" 

    // procbg.classList.add("mybg");
    // procbg.classList.add("el-loading-mask")
    // procbg.style.backgroundColor = "rgba(0, 0, 0, 0.8)";  

    // document.body.appendChild(procbg);   

    console.log('*******SHOW MASK*********\n', content)

    store.commit('chart/SET_CHART_LOADING', {
        isChartLoading:true,
        showProgress:false,
        percentage:0,
        progressText:content
    })
}  

// update test on mask
CIQ.setCoverText = function(cont){
    let coverText
    if(document.getElementsByClassName('mybg')[0]){
        coverText= document.getElementsByClassName('mybg')[0].children[0].children[1]
        coverText.innerHTML = cont
    }
}
  
CIQ.hideCover = function hide() { 
    console.log('*******HIDE MASK*********')
    // var body = document.getElementsByTagName("body"); 
    // let coverList = document.getElementsByClassName('mybg')
    // for(var item of coverList){
    //     item.style.display="none"; 
    //     body[0].removeChild(item);
    // }

    store.commit('chart/SET_CHART_LOADING', {
        isChartLoading:false,
        showProgress:false,
        percentage:0,
        progressText:''
    })
}

}
export {__st_js_mask_}
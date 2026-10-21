import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";
import { formatStandardTime } from '@/utils'

// 一些共用工具函数，可以分离出来
let __st_js_utils_ = (_exports) => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

    CIQ.displayableDate = function (stx, chart, dt, includeIntraYear) {
        function twoPlaces(val) {
            if (val < 10) return "0" + val;
            return val;
        }
        var displayableDate = "";
        var interval = stx.layout.interval;
        var isDaily = CIQ.ChartEngine.isDailyInterval(interval);
        var isSecond =
            (chart.xAxis.activeTimeUnit && chart.xAxis.activeTimeUnit <= CIQ.SECOND) ||
            stx.layout.timeUnit == "second";
        var isMS =
            (chart.xAxis.activeTimeUnit &&
                chart.xAxis.activeTimeUnit <= CIQ.MILLISECOND) ||
            stx.layout.timeUnit == "millisecond";
        if (chart.xAxis.formatter) {
            displayableDate = chart.xAxis.formatter(dt);
        } else if (stx.internationalizer) {
            displayableDate = stx.internationalizer.monthDay.format(dt);
            if (isSecond || isMS) {
                displayableDate +=
                    " " + stx.internationalizer.hourMinuteSecond.format(dt);
                if (isMS) displayableDate += "." + dt.getMilliseconds();
            } else if (!isDaily) {
                if (includeIntraYear)
                    displayableDate = stx.internationalizer.yearMonthDay.format(dt);
                displayableDate += " " + stx.internationalizer.hourMinute.format(dt);
            } else {
                if (interval == "month")
                    displayableDate = stx.internationalizer.yearMonth.format(dt);
                else displayableDate = stx.internationalizer.yearMonthDay.format(dt);
            }
        } else {
            var m = twoPlaces(dt.getMonth() + 1);
            var d = twoPlaces(dt.getDate());
            var h = twoPlaces(dt.getHours());
            var mn = twoPlaces(dt.getMinutes());
            if (isDaily) {
                displayableDate = interval == "month" ? m + "/" + d + "/" : m + "/" + d + "/";
                displayableDate += dt.getFullYear();
            } else {
                let date = m + "/" + d;
                if (includeIntraYear) date += "/" + dt.getFullYear();
                displayableDate = date + " " + h + ":" + mn;
                if (isSecond || isMS) {
                    var sec = twoPlaces(dt.getSeconds());
                    displayableDate += ":" + sec;
                    if (isMS) {
                        var mil = twoPlaces(dt.getMilliseconds());
                        if (mil < 100) mil = "0" + mil;
                        displayableDate += ":" + mil;
                    }
                }
            }
        }
        return displayableDate;
    };

    CIQ.countDecimalPlaces = function (number) {
        if (!number && number != 0) return 0
        // Convert the number to a string representation
        const numberStr = number.toString();

        // Use regular expression to match the decimal part
        const decimalMatch = numberStr.match(/\.(\d+)/);

        // If a decimal part is found, return its length (number of decimal places)
        // Otherwise, return 0
        return decimalMatch ? decimalMatch[1].length > 4 ? 4 : decimalMatch[1].length : 0;
    }

    // description pop up window
    CIQ.description = function(value){
        document.querySelector(".discription_div").innerHTML = `<cq-study-dialog class="discription_dialog"></cq-study-dialog>`;
            document.querySelector(".discription_dialog").innerHTML = `
                    <cq-dialog class="ciq-day" cq-study-dialog="true" cq-active="true" style="top: 50%; left: 50%; transform: translate(-50%, -20%);">
                    <cq-study-dialog cq-study-axis="true" cq-study-panel="alias">
                    <h4 class="title" style="font-size: 20px; font-weight: 500">`+ value+`</h4>
                    <div class="ps__rail-x" style="left: 0px; bottom: 0px;"><div class="ps__thumb-x" tabindex="0" style="left: 0px; width: 0px;"></div></div><div class="ps__rail-y" style="top: 0px; right: 0px; height: 373px;"><div class="ps__thumb-y" tabindex="0" style="top: 0px; height: 322px;"></div></div></cq-scroll>
                    <div class="ciq-dialog-cntrls">
                    <div class="ciq-btn discription-btn" >Done</div>
                    </div>
                </cq-study-dialog></cq-dialog>`;
                    document.querySelector(".discription-btn").addEventListener("click",function(){
                        document.querySelector(".discription_div").innerHTML = ""
                    })
    }

    CIQ.measureBarDistance = function(d1,d2) {
        var quotes = CIQ.stxx.chart.dataSet;
        const standardStartDate = formatStandardTime(d1)
        const standardEndDate = formatStandardTime(d2)
        const subQuotes = quotes.filter(item => item.DT.getTime()>=standardStartDate.getTime() && item.DT.getTime()<=standardEndDate.getTime())
        return subQuotes.length
    }
    CIQ.getStartDateByNumberOfBars = function(d2,barDistance) {
        var quotes = CIQ.stxx.chart.dataSet;
        var standardEndDate = formatStandardTime(d2)
        if(standardEndDate.getTime()>quotes[quotes.length-1].DT.getTime()) standardEndDate = quotes[quotes.length-1].DT
        const startDateIndex = quotes.findIndex(item => item.DT.getTime()==standardEndDate.getTime()) - barDistance + 1
        if(startDateIndex < 0) return
        const startDate = quotes[startDateIndex].Date
        return startDate.slice(0,4)+ '-' + startDate.slice(4,6)+ '-' + startDate.slice(6,8)
    }
    CIQ.getYearInverval = function() {
        var quotes = CIQ.stxx.chart.dataSet;
        var start = quotes[0].DT.getFullYear()
        var end = quotes[quotes.length-1].DT.getFullYear()
        return end - start
    }
}
export { __st_js_utils_ }
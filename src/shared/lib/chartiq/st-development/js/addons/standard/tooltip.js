import {CIQ} from "chartiq/js/chartiq.js";
import { getCoresSymbolDual } from '@/shared/lib/chartiq/utils';

let __st_addons_standard_tooltip_ = (_exports) => {

/* global _CIQ, _timezoneJS, _SplinePlotter */


var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Marker) {
	console.error("tooltip addon requires first activating markers feature.");
} else {
	/**
	 * Add-on that creates a detailed tooltip as the user's mouse hovers over data points on the
	 * chart. The tooltip contains information such as the open, high, low, and close prices of
	 * stock quotes.
	 *
	 * Tooltip example:
	 * <iframe width="800" height="500" scrolling="no" seamless="seamless" align="top"
	 *         style="float:top"
	 *         src="https://jsfiddle.net/chartiq/5kux6j8p/embedded/result,js,html/"
	 *         allowfullscreen="allowfullscreen" frameborder="1">
	 * </iframe>
	 *
	 * **Note:** Prior to version 8.2.0, the tooltip was directly linked to the crosshairs. The
	 * crosshairs had to be active for the tooltip to be displayed.
	 *
	 * Requires *addOns.js* and *markers.js*, or the bundle *standard.js*.
	 *
	 * There can be only one `CIQ.Tooltip` per chart.
	 *
	 * Color and layout can be customized by overriding the CSS rule-sets defined for the
	 * `stx-hu-tooltip` and related type selectors in *stx-chart.css*. Do not modify
	 * *stx-chart.css*; create a separate style sheet file that overrides *stx-chart.css* in the
	 * CSS cascade. See the example below.
	 *
	 * `CIQ.Tooltip` automatically creates its own HTML inside the chart container. Here is an
	 * example of the structure (there will be one field tag per displayed element):
	 * ```
	 * <stx-hu-tooltip>
	 *     <stx-hu-tooltip-field>
	 *         <stx-hu-tooltip-field-name></stx-hu-tooltip-field-name>
	 *         <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
	 *     </stx-hu-tooltip-field>
	 * </stx-hu-tooltip>
	 * ```
	 * By default, the `stx-hu-tooltip-field` elements are inserted in the following order:
	 * - DT
	 * - Open
	 * - High
	 * - Low
	 * - Close
	 * - Volume
	 * - series
	 * - studies
	 *
	 * But the default layout can be changed. You can override the order of fields or change the
	 * labels by manually inserting the HTML that the tooltip would otherwise have created for
	 * that field. If no override HTML is found for a particular field, the default is used.
	 * **Note:** This HTML must be placed inside the chart container.
	 *
	 * All of the code is provided in *addOns.js* and can be fully customized by copying the
	 * source code from the library and overriding the functions with your changes. Be sure to
	 * never modify a library file, as this will hinder upgrades.
	 *
	 * For example, concatenating the field name (e.g., "Jaw") with the study name (e.g.,
	 * "Alligator" ) is the default behavior of the tooltip for displaying the value title. Feel
	 * free to override this behavior by creating your own custom version of the `renderFunction()`
	 * for the `CIQ.Tooltip`. To do this, copy the entire `CIQ.Tooltip` code (found in *addOns.js*)
	 * and make the changes to your custom version. Load your custom version instead. Specifically,
	 * look for the following code in the `renderFunction()` that pushes out the text for each
	 * study field:
	 * ```
	 * let newFieldName = document.createElement("stx-hu-tooltip-field-name");
	 * newFieldName.innerHTML = this.translateIf(fieldName);
	 * newField.appendChild(newFieldName);
	 * ```
	 * Replace `fieldName` with anything you want to use as the field title and push that instead.
	 *
	 * Visual Reference:<br>
	 * ![stx-hu-tooltip](stx-hu-tooltip.png "stx-hu-tooltip")
	 *
	 * @param {object} tooltipParams The constructor parameters.
	 * @param {CIQ.ChartEngine} [tooltipParams.stx] The chart object.
	 * @param {boolean} [tooltipParams.ohl] Set to true to show OHL data (Close is always shown).
	 * @param {boolean} [tooltipParams.volume] Set to true to show Volume.
	 * @param {boolean} [tooltipParams.series] Set to true to show value of series.
	 * @param {boolean} [tooltipParams.studies] Set to true to show value of studies.
	 * @param {boolean} [tooltipParams.showOverBarOnly] Set to true to show the tooltip only when
	 * 		the mouse is over the primary line/bars.
	 * @param {boolean} [tooltipParams.change] Set to true to show the change in daily value
	 * 		when the internal chart periodicity is a daily interval (see
	 * 		{@link CIQ.ChartEngine.isDailyInterval}).
	 * @param {boolean} [tooltipParams.interpolation] Set to true to show the estimated value when
	 * 		there is no data between bars. **Note:** A value of `null` is not considered missing
	 * 		data.
	 * @param {boolean} [tooltipParams.useDataZone] Set to true to show the date in the `dataZone`
	 * 		time zone; false, to use the `displayZone` time zone (see
	 * 		{@link CIQ.ChartEngine#setTimeZone}).
	 * @param {boolean} [tooltipParams.showBarHighlight=true] Specifies whether the bar (data
	 * 		point) the mouse is hovering over is highlighted. Applies to the floating tooltip only
	 * 		(the dynamic tooltip points to the bar). If the crosshairs are active, this parameter
	 * 		is ignored.
	 *
	 * @constructor
	 * @name CIQ.Tooltip
	 * @since
	 * - 09-2016-19
	 * - 5.0.0 Now `tooltipParams.showOverBarOnly` is available to show tooltip only when over the
	 * 		primary line/bars.
	 * - 5.1.1 `tooltipParams.change` set to true to show the change in daily value when
	 * 		displaying a daily interval.
	 * - 6.2.5 New `tooltipParams.interpolation` flag to show estimated value for missing series
	 * 		data points.
	 * - 7.0.0 New `tooltipParams.useDataZone` flag to show the date in either the `dataZone` or
	 * 		`displayZone` date/time.
	 * - 8.2.0 Decoupled `CIQ.Tooltip` from the crosshairs and added highlighting of the data
	 * 		point (or bar) the mouse is hovering over. The new `tooltipParams.showBarHighlight`
	 * 		parameter enables or disables the highlighting.
	 *
	 * @example <caption>Add a tooltip to a chart:</caption>
	 * // First declare your chart engine.
	 * const stxx = new CIQ.ChartEngine({ container: document.querySelector(".chartContainer")[0] });
	 *
	 * // Then link the tooltip to that chart.
	 * // Note how we've enabled OHL, Volume, Series and Studies.
	 * new CIQ.Tooltip({ stx: stxx, ohl: true, volume: true, series: true, studies: true });
	 *
	 * @example <caption>Customize the order, layout, or text in tooltip labels:</caption>
	 * // In this example, we've rearranged the HTML to display the Close field first, then the DT.
	 * // We are also labeling the DT 'Date/Time' and the Close 'Last'.
	 * // The rest of the fields are displayed in their default order.
	 *
	 * <stx-hu-tooltip>
	 *     <stx-hu-tooltip-field field="Close">
	 *         <stx-hu-tooltip-field-name>Last</stx-hu-tooltip-field-name>
	 *         <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
	 *     </stx-hu-tooltip-field>
	 *     <stx-hu-tooltip-field field="DT">
	 *         <stx-hu-tooltip-field-name>Date/Time</stx-hu-tooltip-field-name>
	 *         <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
	 *     </stx-hu-tooltip-field>
	 * </stx-hu-tooltip>
	 *
	 * @example <caption>Customize the CSS for the tooltip (see <i>stx-chart.css</i>):</caption>
	 * stx-hu-tooltip {
	 *     position: absolute;
	 *     left: -50000px;
	 *     z-index: 30;
	 *     white-space: nowrap;
	 *     padding: 6px;
	 *     border: 1px solid gray;
	 *     background-color: rgba(42,81,208,.5);
	 *     color: white;
	 * }
	 *
	 * stx-hu-tooltip-field {
	 *     display:table-row;
	 * }
	 *
	 * stx-hu-tooltip-field-name {
	 *     display:table-cell;
	 *     font-weight:bold;
	 *     padding-right:5px;
	 * }
	 *
	 * stx-hu-tooltip-field-name:after {
	 *     content:':';
	 * }
	 *
	 * stx-hu-tooltip-field-value {
	 *     display:table-cell;
	 *     text-align:right;
	 * }
	 */
     CIQ.Tooltip =
     CIQ.Tooltip ||
     function (tooltipParams) {
         if (!CIQ.Marker) {
             console.warn(
                 "CIQ.Tooltip addon requires CIQ.Marker module to be enabled."
             );
             return;
         }
     
         this.cssRequired = true;
     
         const {
             stx,
             ohl: showOhl,
             change: showChange,
             volume: showVolume,
             series: showSeries,
             studies: showStudies,
             interpolation: showInterpolation,
             showOverBarOnly,
             showBarHighlight = true,
             useDataZone
         } = tooltipParams;
         const { container } = stx.chart;
     
         let node = container.querySelector("stx-hu-sttooltip");
         if (!node) {
             node = document.createElement("stx-hu-sttooltip");
             container.appendChild(node);
         }
     
         let highlightEl = container.querySelector(".stx-hu-tooltip-highlight");
         if (!highlightEl) {
             highlightEl = document.createElement("div");
             highlightEl.classList.add("stx-hu-tooltip-highlight");
             container.appendChild(highlightEl);
         }
     
         CIQ.Marker.Tooltip = function (params) {
             if (!this.className) this.className = "CIQ.Marker.Tooltip";
             this.highlightEl = highlightEl;
             params.label = "tooltip";
             CIQ.Marker.call(this, params);
         };
     
         CIQ.inheritsFrom(CIQ.Marker.Tooltip, CIQ.Marker, false);
     
         CIQ.Marker.Tooltip.sameBar = function (bar1, bar2) {
             if (!bar1 || !bar2) return false;
             if (+bar1.DT != +bar2.DT) return false;
             if (bar1.Close != bar2.Close) return false;
             if (bar1.Open != bar2.Open) return false;
             if (bar1.Volume != bar2.Volume) return false;
             return true;
         };
     
         CIQ.Marker.Tooltip.placementFunction = function (params) {
             if (hideIfDisabled()) return;
             var offset = 30;
             var stx = params.stx;

             for (var i = 0; i < params.arr.length; i++) {
                 var marker = params.arr[i];
                 var bar = stx.barFromPixel(stx.cx);
                 var quote = stx.chart.dataSegment[bar];
                 var goodBar;
                 var overBar = true;
                 var highPx, lowPx;
     
                 if (quote != "undefined" && quote && quote.DT) {
                     goodBar = true;
                     if (quote.High) highPx = stx.pixelFromPrice(quote.High);
                     if (quote.Low) lowPx = stx.pixelFromPrice(quote.Low);
                     if (!stx.chart.highLowBars) {
                         if (quote.Close) {
                             highPx = stx.pixelFromPrice(quote.Close) - 15;
                             lowPx = stx.pixelFromPrice(quote.Close) + 15;
                         }
                     }
                     if (showOverBarOnly && !(stx.cy >= highPx && stx.cy <= lowPx))
                         overBar = false;
                 }
     
                 if (
                     !(
                         stx.insideChart &&
                         !stx.openDialog &&
                         !stx.activeDrawing &&
                         !stx.grabbingScreen &&
                         goodBar &&
                         overBar
                     )
                 ) {
                     highlightEl.style.display = "none";
                     marker.node.style.left = "-50000px";
                     marker.node.style.right = "auto";
                     marker.lastBar = {};
                     return;
                 }
                 if (
                     CIQ.Marker.Tooltip.sameBar(
                         stx.chart.dataSegment[bar],
                         marker.lastBar
                     ) &&
                     bar != stx.chart.dataSegment.length - 1
                 ) {
                     return;
                 }
     
                 marker.lastBar = stx.chart.dataSegment[bar];
                 var cw = marker.lastBar.candleWidth || stx.layout.candleWidth;

                //  if (
                //      parseInt(getComputedStyle(marker.node).width, 10) +
                //          stx.chart.panel.left +
                //          offset +
                //          cw <
                //      stx.backOutX(CIQ.ChartEngine.crosshairX)
                //  ) {
                //      marker.node.style.left = "auto";
                //      marker.node.style.right =
                //          Math.round(
                //              container.clientWidth - stx.pixelFromBar(bar) + offset
                //          ) + "px";
                //  } else {
                //      marker.node.style.left =
                //          Math.round(stx.pixelFromBar(bar) + offset) + "px";
                //      marker.node.style.right = "auto";
                //  }

                // Overwrite
                // 新增判断：如果鼠标在图表右半部分，则 tooltip 显示在左侧，否则显示在右侧
                // console.log(stx.backOutX(CIQ.ChartEngine.crosshairX),parseInt(getComputedStyle(marker.node).width, 10))
                if (stx.backOutX(CIQ.ChartEngine.crosshairX) > container.clientWidth / 2) {
                    // 鼠标在右侧：tooltip 显示在左侧
                    marker.node.style.left = "auto"
                    marker.node.style.right = 
                        Math.round( container.clientWidth - stx.pixelFromBar(bar) + offset,10) + "px";
                } else {
                    // 鼠标在左侧：tooltip 显示在右侧
                    marker.node.style.left = 
                        Math.round(stx.pixelFromBar(bar) + offset,10) + "px";
                    marker.node.style.right = "auto";
                }
                 var height = parseInt(getComputedStyle(marker.node).height, 10);
                 var top = Math.round(
                     CIQ.ChartEngine.crosshairY - stx.top - height / 2
                 );
                 if (top + height > stx.height) top = stx.height - height;
                 if (top < 0) top = 0;
                 marker.node.style.top = top + "px";
     
                 if (showBarHighlight && !stx.layout.crosshair) {
                     const candleWidth =
                         marker.lastBar.candleWidth || stx.layout.candleWidth;
                     const left = stx.pixelFromBar(bar) - candleWidth / 2;
                     let width = candleWidth;
     
                     if (left + width > stx.chart.width) {
                         // adjust width of last bar so it does not highlight past the edge of the chart into the y axis
                         width = stx.chart.width - left;
                     }
     
                     highlightEl.style.display = "block";
                     highlightEl.style.left = left + "px";
                     highlightEl.style.width = width + "px";
                 } else {
                     highlightEl.style.display = "none";
                 }
             }
             // backwards compatibility
             // temporarily disable overXAxis, overYAxis so the crosshairs don't hide if touch device and over Y axis (this can happen
             // due to the offset which we apply)
             if (stx.layout.crosshair) {
                 var overXAxis = stx.overXAxis,
                     overYAxis = stx.overYAxis;
                 stx.overXAxis = stx.overYAxis = false;
                 stx.doDisplayCrosshairs();
                 stx.overXAxis = overXAxis;
                 stx.overYAxis = overYAxis;
             }
         };
     
         function hideIfDisabled() {
             const { headsUp, crosshair } = stx.layout;
             const isFloating =
                 (headsUp && headsUp.floating) || headsUp === "floating";
     
             const crosshairsOn =
                 crosshair &&
                 stx.displayCrosshairs &&
                 ["static", null, undefined].includes(headsUp); // backwards compatibility
     
             if (stx.huTooltip && !isFloating && !crosshairsOn) {
                 hideTooltip();
                 return true;
             }
     
             return false;
         }
     
         function hideTooltip() {
             const { huTooltip } = stx;
             const { node } = huTooltip;
             if (!node) return;
             node.style.left = "-50000px";
             node.style.right = "auto";
             huTooltip.lastBar = {};
             if (huTooltip.highlightEl) huTooltip.highlightEl.style.display = "none";
         }
         function renderFunction() {
             // the tooltip has not been initialized with this chart.
             if (hideIfDisabled()) return;
     
             var bar = this.barFromPixel(this.cx),
                 data = this.chart.dataSegment[bar];

             if (!data) {
                 hideTooltip();
                 return;
             }
             if (
                 CIQ.Marker.Tooltip.sameBar(data, this.huTooltip.lastBar) &&
                 bar != this.chart.dataSegment.length - 1
             ) {
                 return;
             }
             var node = this.huTooltip.node;
             Array.from(node.parentElement.querySelectorAll("[auto]")).forEach(
                 function (i) {
                     i.remove();
                 }
             );
             Array.from(
                 node.parentElement.querySelectorAll("stx-hu-tooltip-field-value")
             ).forEach(function (i) {
                 i.innerHTML = "";
             });
     
             var panel = this.chart.panel;
             var yAxis = panel.yAxis;
             var dupMap = {};
             var fields = [];
             fields.push({
                 member: "DT",
                 display: "DT",
                 panel: panel,
                 yAxis: yAxis
             });
             fields.push({
                 member: "Close",
                 display: "Close",
                 panel: panel,
                 yAxis: yAxis
             });
             dupMap.DT = dupMap.Close = 1;
             if (
                 showChange &&
                 CIQ.ChartEngine.isDailyInterval(this.layout.interval)
             ) {
                 fields.push({
                     member: "Change",
                     display: "Change",
                     panel: panel,
                     yAxis: yAxis
                 });
             }
             if (showOhl) {
                 fields.push({
                     member: "Open",
                     display: "Open",
                     panel: panel,
                     yAxis: yAxis
                 });
                 fields.push({
                     member: "High",
                     display: "High",
                     panel: panel,
                     yAxis: yAxis
                 });
                 fields.push({
                     member: "Low",
                     display: "Low",
                     panel: panel,
                     yAxis: yAxis
                 });
                 dupMap.Open = dupMap.High = dupMap.Low = 1;
             }
             if (showVolume) {
                 fields.push({
                     member: "Volume",
                     display: "Volume",
                     panel: null,
                     yAxis: null
                 }); // null yAxis use raw value
                 dupMap.Volume = 1;
             }
             if (showSeries) {
                 var renderers = this.chart.seriesRenderers;
                 for (var renderer in renderers) {
                     var rendererToDisplay = renderers[renderer];
                     if (rendererToDisplay === this.mainSeriesRenderer) continue;
                     panel = this.panels[rendererToDisplay.params.panel];
                     yAxis = rendererToDisplay.params.yAxis;
                     if (!yAxis && rendererToDisplay.params.shareYAxis)
                         yAxis = panel.yAxis;
                     for (var id = 0; id < rendererToDisplay.seriesParams.length; id++) {
                         var seriesParams = rendererToDisplay.seriesParams[id];
                         // if a series has a symbol and a field then it maybe a object chain
                         var sKey = seriesParams.symbol;
                         var subField = seriesParams.field;
                         if (!sKey) sKey = subField;
                         else if (subField && sKey != subField)
                             sKey = CIQ.createObjectChainNames(sKey, subField)[0];
                         var display =
                             seriesParams.display ||
                             seriesParams.symbol ||
                             seriesParams.field;
                         if (sKey && !dupMap[display]) {
                             fields.push({
                                 member: sKey,
                                 display: display,
                                 panel: panel,
                                 yAxis: yAxis,
                                 isSeries: true
                             });
                             dupMap[display] = 1;
                         }
                     }
                 }
             }
             if (showStudies) {
                 for (var study in this.layout.studies) {
                     var sd = this.layout.studies[study];
                     const isSymbol2 = sd.parameters.criteria?.endsWith("2") || sd.parameters.isComparison
                     const symbolLabel = getCoresSymbolDual(isSymbol2)
                     panel = this.panels[sd.panel];
                     yAxis = panel && sd.getYAxis(this);
                     if(sd.type == 'ST MA' || sd.type == 'ma'){    // stma不需要symbol信息，有独立显示
                        // miIndicator独立设定ma的display name显示，考虑到有偏移量这一设定
                        const miShift = CIQ.store.$state.miFormShift
                        if(miShift.showInput && miShift.display && sd.parameters.criteria.endsWith(2)) {
                            for (var output in sd.outputMap) {
                                if (output && !dupMap[output]) {
                                    const maType = sd.inputs.Type=='exponential'?' EMA':' SMA'
                                    const field = sd.inputs.Field == 'field'? 'Close': rocDisplayName(sd.inputs.Field)
                                    name = `${field} ${maType}${sd.inputs.Period}(shift-${miShift.value || 0})`
                                    let symbol = ['Open','High','Low','Close','Volume'].includes(field) ?`(${symbolLabel})`:''
    
                                     fields.push({
                                         member: output,
                                         display: `${symbol}${name}`,
                                         panel: panel,
                                         yAxis: yAxis
                                     });
                                     dupMap[output] = 1;
                                 }
                            }
                        } else {
                            const key = sd.inputs.Field + sd.inputs.Period + sd.inputs.Type
                            for (var output in sd.outputMap) {
                                if (output && !dupMap[key]) {
                                    const maType = sd.inputs.Type=='exponential'?' EMA':' SMA'
                                    const field = sd.inputs.Field == 'field'? 'Close': rocDisplayName(sd.inputs.Field)
                                    let name = `${field} ${maType}${sd.inputs.Period}`
                                    let symbol = ['Open','High','Low','Close','Volume'].includes(field) ?`(${symbolLabel})`:''
    
                                     fields.push({
                                         member: output,
                                         display: `${symbol}${name}`,
                                         panel: panel,
                                         yAxis: yAxis
                                     });
                                     dupMap[key] = 1;
                                 }
                            }
                        }
                     }
                     else if(CIQ.findSymbolIndicator(sd.type,null)){
                        for (var output in sd.outputMap) {
                            if (output && !dupMap[output]) {
                                 fields.push({
                                     member: output,
                                     display: sd.inputs.display?sd.inputs.display:`(${symbolLabel})${sd.type}`,
                                     panel: panel,
                                     yAxis: yAxis
                                 });
                                 dupMap[output] = 1;
                             }
                        }
                     }
                     else if(sd.type == 'ShiftedSentimentIndicator') {
                        for (var output in sd.outputMap) {
                            if (output && !dupMap[output]) {
                                 fields.push({
                                     member: output,
                                     display: sd.inputs.display,
                                     panel: panel,
                                     yAxis: yAxis
                                 });
                                 dupMap[output] = 1;
                             }
                        }
                     }
                     else if(sd.type == 'ST ROCLike' || sd.type == 'Amplitude' || sd.type == 'CriteriaScore'){ // roc自带symbol信息
                        for (var output in sd.outputMap) {
                            if (output && !dupMap[output]) {
                                 fields.push({
                                     member: output,
                                     display: output,
                                     panel: panel,
                                     yAxis: yAxis
                                 });
                                 dupMap[output] = 1;
                             }
                        }
                     }else{
                        for (var output in this.layout.studies[study].outputMap) {
                            //a dumb way to show full name of indicator
                            let _obj = CIQ.findSentiIndicator(null,output)
                            if(_obj){
                                //console.log(_obj)
                                fields.push({
                                    member: output,
                                    display: _obj.chart_name,
                                    panel: panel,
                                    yAxis: yAxis
                                });
                                dupMap[output] = 1;
                            }
                            else if(CIQ.isUserIndicator(output)){    
                                fields.push({
                                    member: output,
                                    display:output.split(/HASH/)[0],
                                    panel: panel,
                                    yAxis: yAxis
                                });
                                dupMap[output] = 1;
                            }
                           /********************lishan modify start*************************/
                           else if(CIQ.isOwnIndicator(output)){
                               fields.push({
                                   member: output,
                                   display:output.split(/CREATE/)[0],
                                   panel: panel,
                                   yAxis: yAxis
                               });
                               dupMap[output] = 1;
                           }
                           /********************lishan modify end*************************/
                            // 为了给一些scanner ai的indicator加辅助线，但是又得隐藏这条线的tooltip显示
                           //  else if (output == 'supLine') {
                           //    // continue
                           //  }
                            else if (output && !dupMap[output]) {
                                fields.push({
                                    member: output,
                                    //display: output,
                                    display: `(${symbolLabel})${output}`,
                                    panel: panel,
                                    yAxis: yAxis
                                });
                                dupMap[output] = 1;
                            }
                        }
                     }

                     
                     if (!dupMap[study + "_hist"]) {
                         fields.push({
                             member: study + "_hist",
                             display: study + "_hist",
                             panel: panel,
                             yAxis: yAxis
                         });
                         dupMap[study + "_hist"] = 1;
                     }
                     if (!dupMap[study + "_hist1"]) {
                        fields.push({
                            member: study + "_hist1",
                            display: study + "_hist1",
                            panel: panel,
                            yAxis: yAxis
                        });
                        dupMap[study + "_hist1"] = 1;
                    }
                    if (!dupMap[study + "_hist2"]) {
                        fields.push({
                            member: study + "_hist2",
                            display: study + "_hist2",
                            panel: panel,
                            yAxis: yAxis
                        });
                        dupMap[study + "_hist2"] = 1;
                    }
                    //console.log(fields,dupMap)
                 }
             }
             for (var f = 0; f < fields.length; f++) {
                 var obj = fields[f];
                 var name = obj.member;
                 var displayName = obj.display;
                 var isRecordDate = name == "DT";
                 if (
                     isRecordDate &&
                     !useDataZone &&
                     !CIQ.ChartEngine.isDailyInterval(stx.layout.interval)
                 )
                     name = "displayDate"; // display date is timezone adjusted
                 panel = obj.panel;
                 yAxis = obj.yAxis;
                 var labelDecimalPlaces = null;
                 if (yAxis) {
                     if (!panel || panel !== panel.chart.panel) {
                         // If a study panel, use yAxis settings to determine decimal places
                         if (yAxis.decimalPlaces || yAxis.decimalPlaces === 0)
                             labelDecimalPlaces = yAxis.decimalPlaces;
                         else if (yAxis.maxDecimalPlaces || yAxis.maxDecimalPlaces === 0)
                             labelDecimalPlaces = yAxis.maxDecimalPlaces;
                        // If a study panel, set decimal places to it's decimal places, it cannot greater than 4   
                        for (var studyInstanceName in CIQ.stxx.layout.studies) {
                            var _sd = CIQ.stxx.layout.studies[studyInstanceName];
                            if (Object.keys(_sd.outputMap).indexOf(name)!=-1){  
                                labelDecimalPlaces = CIQ.countDecimalPlaces(data[name]);
                            }
                        }
                        if(labelDecimalPlaces == null){
                            // console.log('not found',fields,data,CIQ.stxx.layout.studies)
                           labelDecimalPlaces = 2 
                        }
                     } else {
                         // If a chart panel, then always display at least the number of decimal places as calculated by masterData (panel.chart.decimalPlaces)
                         // but if we are zoomed to high granularity then expand all the way out to the y-axis significant digits (panel.yAxis.printDecimalPlaces)
                         labelDecimalPlaces = Math.max(
                             yAxis.printDecimalPlaces,
                             panel.chart.decimalPlaces
                         );
                         //	... and never display more decimal places than the symbol is supposed to be quoting at
                         if (yAxis.maxDecimalPlaces || yAxis.maxDecimalPlaces === 0){
                             labelDecimalPlaces = Math.min(
                                 labelDecimalPlaces,
                                 yAxis.maxDecimalPlaces
                             );
                         }

                         // 新加的，为main panel加上小数点限制
                         for (var studyInstanceName in CIQ.stxx.layout.studies) {
                            var _sd = CIQ.stxx.layout.studies[studyInstanceName];
                            if (Object.keys(_sd.outputMap).indexOf(name)!=-1){  
                                labelDecimalPlaces = CIQ.countDecimalPlaces(data[name]);
                            }
                        }
                     }
                    //  labelDecimalPlaces = 2
                 }
                 var dsField = null;
                 // account for object chains
                 var tuple = CIQ.existsInObjectChain(data, name);
                 if (tuple) dsField = tuple.obj[tuple.member];
                 else if (name == "Change") dsField = data.Close - data.iqPrevClose;
                 
                 var fieldName = displayName.replace(/^(Result )(.*)/, "$2");
                 
                 if (
                     showInterpolation &&
                     fields[f].isSeries &&
                     (dsField === null || typeof dsField == "undefined")
                 ) {
                     // do this only for additional series and not the main series
                     
                     var seriesPrice = this.valueFromInterpolation(
                         bar,
                         fieldName,
                         "Close",
                         panel,
                         yAxis
                     );
                     if (seriesPrice === null) break;
                     dsField = seriesPrice;
                 }
                 if (
                     (dsField || dsField === 0) &&
                     (isRecordDate ||
                         typeof dsField !== "object" ||
                         dsField.Close ||
                         dsField.Close === 0)
                 ) {
                     var fieldValue = "";
                     if (dsField.Close || dsField.Close === 0) dsField = dsField.Close;
                     if (dsField.constructor == Number) {
                        
                         if (!yAxis) {
                             // raw value
                             fieldValue = dsField;
                             
                             var intl = this.internationalizer;
                             if (intl) {
                                 var l = intl.priceFormatters.length;
                                 var decimalPlaces = CIQ.countDecimals(fieldValue);
                                 if (decimalPlaces >= l) decimalPlaces = l - 1;
                                 fieldValue = intl.priceFormatters[decimalPlaces].format(
                                     fieldValue
                                 );
                                 
                             }
                         } else if (
                             yAxis.originalPriceFormatter &&
                             yAxis.originalPriceFormatter.func
                         ) {
                             // in comparison mode with custom formatter
                             fieldValue = yAxis.originalPriceFormatter.func(
                                 this,
                                 panel,
                                 dsField,
                                 labelDecimalPlaces
                             );
                             
                         } else if (
                             yAxis.priceFormatter &&
                             yAxis.priceFormatter != CIQ.Comparison.priceFormat
                         ) {
                             // using custom formatter
                             fieldValue = yAxis.priceFormatter(
                                 this,
                                 panel,
                                 dsField,
                                 labelDecimalPlaces
                             );
                         } else {
                            // tooltip显示上不限制0.005的decimal places限制
                            //  if(dsField>-0.005 && dsField<0){dsField = -0.01}
                            //  else if(dsField>0 && dsField<0.005){dsField = 0.01}
                            // 特殊处理Symbol Volume，它的format为了和Volume一致而不依赖yAxis的配置
                            if(name.includes('Symbol Volume')) fieldValue = dsField;
                            else fieldValue = this.formatYAxisPrice(
                                 dsField,
                                 panel,
                                 labelDecimalPlaces,
                                 yAxis
                             );
                           
                             //console.log(dsField + ' with ' + fieldValue)
                             
                         }
                     } else if (dsField.constructor == Date) {
                         if (
                             isRecordDate &&
                             this.controls.floatDate &&
                             this.controls.floatDate.innerHTML
                         ) {
                             if (this.chart.xAxis.noDraw) fieldValue = "N/A";
                             else
                                 fieldValue = CIQ.displayableDate(this, panel.chart, dsField);
                         } else {
                             fieldValue = CIQ.yyyymmdd(dsField);
                             if (!CIQ.ChartEngine.isDailyInterval(this.layout.interval)) {
                                 fieldValue += " " + dsField.toTimeString().substr(0, 8);
                             }
                         }
                     } else {
                         fieldValue = dsField;
                         
                     }
                     var dedicatedField = node.querySelector(
                         'stx-hu-tooltip-field[field="' + fieldName + '"]'
                     );
     
                     if (dedicatedField) {
                         dedicatedField.querySelector(
                             "stx-hu-tooltip-field-value"
                         ).innerHTML = fieldValue;
                         
                         var fieldNameField = dedicatedField.querySelector(
                             "stx-hu-tooltip-field-name"
                         );
                         if (fieldNameField.innerHTML === "") {
                             fieldNameField.innerHTML = fieldName;
                             
                             if (CIQ.I18N && CIQ.I18N.localized)
                                 CIQ.I18N.translateUI(null, fieldNameField);
                         }
                     } else {
                         var newField = document.createElement("stx-hu-tooltip-field");
                         newField.setAttribute("auto", true);
                         var newFieldName = document.createElement(
                             "stx-hu-tooltip-field-name"
                         );
                         newFieldName.innerHTML = this.translateIf(fieldName);
     
                         //console.log(newFieldName.innerHTML)
     
                         newField.appendChild(newFieldName);
                         var newFieldValue = document.createElement(
                             "stx-hu-tooltip-field-value"
                         );
                         newFieldValue.innerHTML = fieldValue;
                         
                         newField.appendChild(newFieldValue);
                         node.appendChild(newField);
                     }
                 } else {
                     var naField = node.querySelector(
                         'stx-hu-tooltip-field[field="' + fieldName + '"]'
                     );
                     if (naField) {
                         var naFieldNameField = naField.querySelector(
                             "stx-hu-tooltip-field-name"
                         );
                         if (naFieldNameField.innerHTML !== "")
                             naField.querySelector("stx-hu-tooltip-field-value").innerHTML =
                                 "n/a";
                     }
                 }
             }
             this.huTooltip.render();
         }
            // 处理用户自定义indicator的显示名
            function rocDisplayName(field) {
                let display
                let senti = CIQ.findSentiIndicator(null,field)
                if(CIQ.isOwnIndicator(field)){
                    display = field.split(/CREATE/)[0]
                }else if(CIQ.isUserIndicator(field)){
                    display = field.split(/HASH/)[0]
                }else if(senti){
                    display = senti.chart_name
                }else {
                    display = field
                }
                return display
            }
         container.addEventListener("mouseout", hideTooltip);
     
         stx.append("deleteHighlighted", function () {
             this.huTooltip.lastBar = {};
             this.headsUpHR();
         });
         stx.append("headsUpHR", renderFunction);
         stx.append("createDataSegment", renderFunction);
         stx.huTooltip = new CIQ.Marker.Tooltip({
             stx: stx,
             xPositioner: "bar",
             chartContainer: true,
             node: node
         });
     };
}

};


export {__st_addons_standard_tooltip_};

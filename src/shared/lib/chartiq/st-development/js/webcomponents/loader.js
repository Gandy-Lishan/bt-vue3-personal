//import store from '../../../../src/store/store.ts'
let __js_webcomponents_loader_ = (_exports) => {

    /* global _CIQ, _timezoneJS, _SplinePlotter */
    
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    /**
     * Loader web component `<cq-loader>`.
     *
     * CSS loading icon.
     *
     * @namespace WebComponents.cq-loader
     *
     * @example
     * <cq-loader><cq-loader>
     */
    class Loader extends CIQ.UI.ContextTag {
        setContext(context) {
            this.context.setLoader(this);
        }
        /**
         * Shows the loading icon.
         * @alias show
         * @memberof WebComponents.cq-loader
         */
        show() {
            this.classList.add("stx-show");
            CIQ.loading = true;
        }
    
        /**
         * Hides the loading icon.
         * @alias hide
         * @memberof WebComponents.cq-loader
         */
        hide() {
            this.classList.remove("stx-show");
            CIQ.loading = false;
        }
    }
    CIQ.UI.addComponentDefinition("cq-loader", Loader);
}
export {__js_webcomponents_loader_}
    
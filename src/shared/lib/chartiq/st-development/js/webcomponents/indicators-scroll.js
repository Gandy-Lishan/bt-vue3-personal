import {CIQ} from "chartiq/js/chartiq.js"
let __js_webcomponents_indicatorsScroll_ = (_exports) => {

    /* global _CIQ, _timezoneJS, _SplinePlotter */
    
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    /**
     * Scroll web component `<cq-scroll>`.
     *
     * The cq-scroll web component creates a scrollable container, which resizes itself when the screen
     * is resized. If CIQ.UI.scrollbarStyling is initialized to a scrollbar implementation (such as
     * PerfectScrollbar), the scrollbar implementation replaces the native scrollbar.
     *
     * **Keyboard control**
     *
     * When selected with tab key navigation and activated with Return/Enter, this component has the
     * following internal controls:
     * - Up/Down arrow &mdash; Move selection between internal cq-item elements.
     * - Left/Right arrow &mdash; Select a control within a selected cq-item element, such as
     * Remove and Edit buttons. Child elements must have the attribute `keyboard-selectable-child` set
     * to "true" to be selectable with these keys.
     *
     * **Attributes**
     * - cq-no-claim &mdash; Do not apply any keystroke capturing
     * - cq-no-maximize &mdash; Do not automatically maximize the height (but keep it showing on screen)
     * - cq-no-resize &mdash; Do not apply any sizing logic
     *
     * Use `this.dataPortion` to dynamically inject items into the list.
     *
     * @namespace WebComponents.cq-scroll
     * @since
     * - 6.1.0 Added `cq-no-claim` attribute.
     * - 8.3.0 Enabled internal keyboard navigation and selection.
     *
     * @example
     * <cq-lookup-results>
     *     <cq-lookup-filters cq-no-close>
     *         <cq-filter class="true">ALL</cq-filter>
     *         <cq-filter>STOCKS</cq-filter>
     *         <cq-filter>FX</cq-filter>
     *         <cq-filter>INDEXES</cq-filter>
     *         <cq-filter>FUNDS</cq-filter>
     *         <cq-filter>FUTURES</cq-filter>
     *     </cq-lookup-filters>
     *     <cq-scroll></cq-scroll>
     * </cq-lookup-results>
     */
    class IndicatorsScroll extends CIQ.UI.BaseComponent {
        connectedCallback() {
            if (this.attached) return;
            super.connectedCallback();
            if (!this.hasAttribute("cq-no-claim")) this.addClaim(this);
            if (this.hasAttribute("cq-no-scroll")) return;
            // Setting CSS in constructor will throw exception when calling document.createElement (done in plugins)
            // So set default CSS here when connected instead.
            this.style.overflowY = "auto";
            this.uiManager = CIQ.UI.getUIManager();
            if (this.uiManager.length > 0) this.uiManager = this.uiManager[0];
    
            // prevent mousewheel event from propagating up to parents, such as when embedded
            // in a chart, e.g. comparison lookup component
            this.addEventListener(
                CIQ.wheelEvent,
                function (e) {
                    e.stopPropagation();
                },
                { passive: false }
            );
    
            var self = this;
            CIQ.UI.addResizeListener(this, function () {
                self.resize();
            });
            this.resize();
        }
    
        disconnectedCallback() {
            CIQ.UI.removeResizeListener(this);
            super.disconnectedCallback();
        }
    
        /**
         * Returns the focused element or null. An item is focused if it has
         * attribute cq-focused.
         * @return {HTMLElement} The element or null
         * @alias focused
         * @memberof WebComponents.cq-scroll
         */
        focused() {
            var focused = this.node.find("cq-item[cq-focused]");
            if (focused.length) return focused[0];
            return null;
        }
    
        /**
         * Scroll components can handle up and down enter keystrokes.
         * They do not register for claims directly. Another section of code must
         * establish the claim on their behalf or proxy the keystroke.
         *
         * Up and down arrows will iterate through cq-item tags. The attribute
         * cq-focused will be added to the currently focused tag. This can then be
         * queried later, such as when a user hits enter.
         *
         * space bar or enter will call the selectFC callback on the cq-item if it exists
         * @param {undefined} hub Unused parameter
         * @param {string} key Key that was stroked
         * @param {object} e The event object
         * @return {boolean}
         */
        keyStroke(hub, key, e) {
            const activeElements = document.querySelectorAll(".stxMenuActive *");
            if (!Array.from(activeElements).includes(this)) {
                return;
            }
            if (!CIQ.trulyVisible(this)) return false;
            if (this.keyboardNavigationWait && !this.keyboardNavigation) {
                return;
            }
    
            const items = this.querySelectorAll(
                "[keyboard-selectable='true'], cq-item:not(.item-hidden)"
            );
            if (!items.length) return;
    
            if (key == " " || key == "Spacebar" || key == "Enter") {
                const focused = this.findFocused(items);
                if (!focused || !focused.length) return;
                const childItemsSelected = focused[0].querySelectorAll(
                    "[keyboard-selectable-child='true'][cq-focused]"
                );
                if (childItemsSelected.length) this.clickItem(childItemsSelected[0], e);
                else this.clickItem(focused[0], e);
            } else if (key == "ArrowDown" || key == "Down") {
                this.focusNextItem(items);
            } else if (key == "ArrowUp" || key == "Up") {
                this.focusNextItem(items, true);
            } else if (key == "ArrowRight" || key == "Right") {
                const focused = this.findFocused(items);
                if (!focused || !focused.length) return;
                const childItems = focused[0].querySelectorAll(
                    "[keyboard-selectable-child='true']"
                );
                if (childItems.length) this.focusNextItem(childItems);
            } else if (key == "ArrowLeft" || key == "Left") {
                const focused = this.findFocused(items)[0];
                if (!focused) return;
                const childItems = focused.querySelectorAll(
                    "[keyboard-selectable-child='true']"
                );
                // If the end of the child items has been reached select the parent item instead
                if (childItems.length && !this.focusNextItem(childItems, true)) {
                    this.removeFocused(childItems);
                    this.focusItem(focused);
                }
            }
            return true;
        }
    
        /**
         * Overrides [focusItem](CIQ.UI.BaseComponent.html#focusItem) in
         * [CIQ.UI.BaseComponent]{@link CIQ.UI.BaseComponent}.
         *
         * Scrolls to an item and gives the item focus.
         *
         * @param {HTMLElement} item The element to scroll to and focus. Must be a child of this
         * component.
         *
         * @alias focusItem
         * @memberof WebComponents.cq-scroll#
         * @since 8.3.0
         */
        focusItem(item) {
            this.scrollToElement(item);
            super.focusItem(item);
        }
    
        onKeyboardDeselection() {
            // If we're using keyboard navigation, return the highlight to the tab selected element
            if (this.keyboardNavigation && this.keyboardNavigation !== null)
                this.keyboardNavigation.highlightPosition();
        }
    
        resize() {
            var node = this.node;
            var context = CIQ.UI.getMyContext(this);
            if (node.parents(".sharing").length)
                return; /*share.js appends this class to the body.
                Do not attempt unnecessary resize of scroll
                for a chart about to become a shared image.*/
            if (this.hasAttribute("cq-no-resize")) return;
            if (this.hasAttribute("cq-no-maximize")) this.noMaximize = true;
            var position = this.getBoundingClientRect();
            var reduceMenuHeight = this.reduceMenuHeight || 45; // defaulted to 45 to take into account 15px of padding on menus and then an extra 5px for aesthetics
            var contextHeight, contextTop;
            if (context && context.topNode) {
                var contextRect = context.topNode.getBoundingClientRect();
                contextHeight = contextRect.height;
                contextTop = contextRect.top;
            } else {
                // Fallback to the window height if context element cannot be found
                contextHeight = window.innerHeight;
                contextTop = 0;
            }
            if (!contextHeight) return;
            var height = contextHeight - (position.top - contextTop) - reduceMenuHeight;
            var holders = node.parents(".stx-holder,.stx-subholder,.chartContainer");
            if (holders.length) {
                holders.each(function () {
                    var holderBottom =
                        this.getBoundingClientRect().top + CIQ.elementDimensions(this).height;
                    height = Math.min(height, holderBottom - position.top - 5); // inside a holder we ignore reduceMenuHeight, but take off 5 pixels just for aesthetics
                });
            }
    
            // If there are subsequent siblings that have a fixed height then make room for them
            var nextAll = node.nextAll();
            for (var i = 0; i < nextAll.length; i++) {
                var sibling = nextAll[i];
                if (sibling && !CIQ.trulyVisible(sibling)) continue; // skip hidden siblings
                height -= CIQ.elementDimensions(sibling, {
                    border: 1,
                    padding: 1,
                    margin: 1
                }).height;
            }
            if (!this.noMaximize) node.css({ height: height + "px" });
            node.css({ "max-height": height + "px" });
            this.refresh();
        }
    
        /**
         * Scrolls to an element.
         *
         * @param {HTMLElement} item The element to scroll to. Must be a child of this component.
         *
         * @alias scrollToElement
         * @memberof WebComponents.cq-scroll#
         */
        scrollToElement(item) {
            var bottom = this.clientHeight,
                scrolled = this.scrollTop;
            var itemBottom = item.offsetTop + item.clientHeight;
            if (item.offsetTop > scrolled && itemBottom < bottom + scrolled) return;
            this.scrollTop = Math.max(itemBottom - bottom, 0);
            this.refresh();
        }
    
        /**
         * Scroll back to top
         */
        top() {
            this.scrollTop = 0;
            this.refresh();
        }
    
        /*
         * Refreshes the scrollbar, if CIQ.UI.scrollbarStyling is enabled.
         * @since 7.2.0
         */
        refresh() {
            if (CIQ.UI.scrollbarStyling) CIQ.UI.scrollbarStyling.refresh(this);
        }
    }
    
    CIQ.UI.addComponentDefinition("cq-indicators-scroll", IndicatorsScroll);
    
    };
    export {__js_webcomponents_indicatorsScroll_}
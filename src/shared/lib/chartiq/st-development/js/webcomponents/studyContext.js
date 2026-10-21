/**
 *	2.2.0
 *	customized studyContext component(right click menu)
 */
let __js_webcomponents_studyContext_ = (_exports) => {

    /* global _CIQ, _timezoneJS, _SplinePlotter */
    
    
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    /**
     * Study Context Dialog web component `<cq-study-context>`.
     *
     * @namespace WebComponents.cq-study-context
     * @since  4.1.0 cq-study-context is now required (cq-dialog[cq-study-context] no longer works)
     */
    class StudyContext extends CIQ.UI.DialogContentTag {
        setContext(context) {
            
            this.addDefaultMarkup();
            this.classList.add("ciq-context-menu");
            
            super.setContext(context);
        }

    }

    StudyContext.markup = `
            <div stxtap="StudyEdit.description()">Indicator Description</div>
            <div stxtap="StudyEdit.addIndicatorCookie()" class="cookie">Add to favorite indicators</div>
            <div stxtap="StudyEdit.edit()">Edit Setting</div>
            <div stxtap="StudyEdit.remove()">Delete Indicator</div>
        `;
    CIQ.UI.addComponentDefinition("cq-study-context", StudyContext);
    
    };
    

    export {__js_webcomponents_studyContext_}
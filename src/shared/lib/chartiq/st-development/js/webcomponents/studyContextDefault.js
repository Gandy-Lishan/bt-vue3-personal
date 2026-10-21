/**
 *	2.2.0
 *	customized studyContext component, technical indicator only(right click menu)
 */
let __js_webcomponents_studyContextDefault_ = (_exports) => {

    /* global _CIQ, _timezoneJS, _SplinePlotter */
    
    
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
    /**
     * Study Context Dialog web component `<cq-study-context>`.
     *
     * @namespace WebComponents.cq-study-context
     * @since  4.1.0 cq-study-context is now required (cq-dialog[cq-study-context] no longer works)
     */
    class StudyContextDefault extends CIQ.UI.DialogContentTag {
        setContext(context) {
            
            this.addDefaultMarkup();
            this.classList.add("ciq-context-menu");
            
            super.setContext(context);
        }

    }

    StudyContextDefault.markup = `
            <div stxtap="StudyEdit.edit()">Edit Setting</div>
            <div stxtap="StudyEdit.remove()">Delete Indicator</div>
        `;
    CIQ.UI.addComponentDefinition("cq-study-context-default", StudyContextDefault);
    
    };
    

    export {__js_webcomponents_studyContextDefault_}
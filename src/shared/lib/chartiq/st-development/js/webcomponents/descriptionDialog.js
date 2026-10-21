let __js_webcomponents_DescriptionContext_ = (_exports) => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */










var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;

if (!CIQ.Studies) {
	console.error(
		"DescriptionDialog component requires first activating studies feature."
	);
} else {
	/**
	 * Study dialogs web component `<cq-study-dialog>`.
	 *
	 * Creates and manages study dialogs based on the corresponding study library entry (title,
	 * inputs, outputs, parameters, etc.).
	 *
	 * Requires {@link CIQ.UI.StudyEdit}.
	 *
	 * Optional Attributes:
	 * - `cq-study-axis` &mdash; Displays UI for selecting the Y-axis position (left, right, etc.),
	 *   color and for inverting the y-axis *if not shared with the primary axis*.
	 * - `cq-study-panel` &mdash; Displays UI for selecting the panel for the study (own, shared,
	 *   etc.) and whether it is rendered as an underlay (under the primary chart) or an overlay
	 *   (over the primary chart). Set this attribute to "alias" to have the panel names listed as
	 *   "<Panel 1>", "<Panel 2>", etc.
	 *
	 * @namespace WebComponents.cq-study-dialog
	 * @since
	 * - 5.2.0 Optional Attributes `cq-study-axis` and `cq-study-panel` are now available.
	 * - 6.3.0 `cq-study-axis` now also provides a check box allowing users to invert study y-axis
	 * 		if not shared with the primary axis.
	 *
	 * @example <caption> Here is an example of how to create a study dialog. We add the
	 * <code>cq-study-axis</code> and <code>cq-study-panel</code> attributes to enable form fields
	 * used to control axis position, color, study panel, and underlay/overlay.
	 * </caption>
	 * <cq-dialog>
	 *      <cq-study-dialog cq-study-axis cq-study-panel>
	 *           <h4 class="title">Study</h4>
	 *           <cq-scroll cq-no-maximize>
	 *                <cq-study-inputs>
	 *                     <template cq-study-input>
	 *                          <cq-study-input>
	 *                               <div class="ciq-heading"></div>
	 *                               <div class="stx-data">
	 *                                    <template cq-menu>
	 *                                         <cq-menu class="ciq-select">
	 *                                              <cq-selected></cq-selected>
	 *                                              <cq-menu-dropdown cq-lift></cq-menu-dropdown>
	 *                                         </cq-menu>
	 *                                    </template>
	 *                               </div>
	 *                          </cq-study-input>
	 *                     </template>
	 *                </cq-study-inputs>
	 *                <hr>
	 *                <cq-study-outputs>
	 *                     <template cq-study-output>
	 *                          <cq-study-output>
	 *                               <div class="ciq-heading"></div>
	 *                               <cq-swatch cq-overrides="auto"></cq-swatch>
	 *                          </cq-study-output>
	 *                     </template>
	 *                </cq-study-outputs>
	 *                <hr>
	 *                <cq-study-parameters>
	 *                     <template cq-study-parameters>
	 *                          <cq-study-parameter>
	 *                               <div class="ciq-heading"></div>
	 *                               <div class="stx-data"><cq-swatch cq-overrides="auto"></cq-swatch>
	 *                                    <template cq-menu>
	 *                                         <cq-menu class="ciq-select">
	 *                                              <cq-selected></cq-selected>
	 *                                              <cq-menu-dropdown cq-lift></cq-menu-dropdown>
	 *                                         </cq-menu>
	 *                                    </template>
	 *                               </div>
	 *                          </cq-study-parameter>
	 *                     </template>
	 *                </cq-study-parameters>
	 *           </cq-scroll>
	 *           <div class="ciq-dialog-cntrls">
	 *                <div class="ciq-btn" stxtap="close()">Done</div>
	 *           </div>
	 *      </cq-study-dialog>
	 * </cq-dialog>
	 */
	class DescriptionDialog extends CIQ.UI.DialogContentTag {
		connectedCallback() {
            console.log("connectedCallback");
			if (this.attached) return;
			super.connectedCallback();
			this.queuedUpdates = {};
		}

		close() {
            console.log("close");
			if (this.addWhenDone) {
				var helper = this.helper;
				var sd = CIQ.Studies.addStudy(helper.stx, helper.name);
				if (!CIQ.isEmpty(this.queuedUpdates)) {
					helper.sd = sd;
					helper.updateStudy(this.queuedUpdates);
					this.queuedUpdates = {};
				}
			}
		}

		disconnectedCallback() {
            console.log("disconnectedCallback");
			CIQ.UI.unobserveProperty("signal", this.helper);
			super.disconnectedCallback();
		}

		formatDateInput(date) {
            console.log("formatDateInput");
			date = date.replace(/-/g, "");
			if (!date.search(/^\d{8}$/))
				date =
					date.substring(0, 4) +
					"-" +
					date.substring(4, 6) +
					"-" +
					date.substring(6, 8);
			return date;
		}

		formatTimeInput(time) {
            console.log("formatTimeInput");
			time = time.replace(/:/g, "");
			if (!time.search(/^\d{4,6}$/))
				time =
					time.substring(0, 2) +
					":" +
					time.substring(2, 4) +
					(time.length == 4 ? "" : ":" + time.substring(4, 6));
			return time;
		}

		hide() {
            console.log("hide");
			if (!CIQ.isEmpty(this.queuedUpdates)) {
				this.helper.updateStudy(this.queuedUpdates);
				this.queuedUpdates = {};
			}
			this.node.find("cq-menu").each(function () {
				if (this.unlift) this.unlift();
			});
			this.node.find("cq-swatch").each(function () {
				if (this.colorPicker) this.colorPicker.close();
			});
		}

		makeMenu(name, currentValue, fields, section) {
            console.log("makeMenu");
			var menu = CIQ.UI.makeFromTemplate(this.menuTemplate);
			var cqMenu = menu.find("cq-menu-dropdown"); // scrollable in menu.
			for (var field in fields) {
				var item = document.createElement("cq-item");
				item.innerText = fields[field];
				item.setAttribute(
					"stxtap",
					"DescriptionDialog.setSelectOption('" + section + "')"
				); // must call DescriptionDialog because the item is "lifted" and so doesn't know its parent
				cqMenu.append(item);
				item.cqMenuWrapper = cqMenu.parents("cq-menu")[0];
				item.setAttribute("name", name);
				item.setAttribute("value", field);
				item.context = this.context;
			}
			var inputValue = menu.find("cq-selected");
			inputValue.text(this.helper.stx.translateIf(currentValue));
			return menu[0];
		}

		open(params) {
            console.log("open");
			this.addDefaultMarkup();
			this.selectTemplates();

			super.open(params);
			params.axisSelect = this.getAttribute("cq-study-axis");
			if (params.axisSelect === "") params.axisSelect = true;
			params.panelSelect = this.getAttribute("cq-study-panel");
			if (params.panelSelect === "") params.panelSelect = true;

			if (typeof params.addWhenDone !== "undefined")
				this.addWhenDone = params.addWhenDone;
			// Generate a "helper" which tells us how to create a dialog
			var self = this,
				stx = this.context.stx;
			CIQ.UI.unobserveProperty("signal", this.helper);
			this.helper = new CIQ.Studies.DialogHelper(params);
			CIQ.UI.observeProperty("signal", this.helper, function (obj) {
				self.refreshInputs();
				self.refreshOutputs();
				self.refreshParameters(params);
			});

			var dialog = this.node;

			dialog.find(".title").text(this.helper.title);

			// Create form elements for all of the inputs
			this.refreshInputs(true);

			// Create form elements for all of the outputs
			this.refreshOutputs(true);

			// Create form elements for all of the parameters
			this.refreshParameters(params, true);
		}



		refreshParameters(params, empty) {
            console.log("refreshParameters");
			var parameters = this.node.find("cq-study-parameters");
			if (empty) parameters.empty();
			for (var i = 0; i < this.helper.parameters.length; i++) {
				var parameter = this.helper.parameters[i];
				var newParam = CIQ.UI.makeFromTemplate(this.parameterTemplate);
				this.menuTemplate = newParam.find("template[cq-menu]");
				if (!this.menuTemplate.length && parameter.options) {
					newParam.remove();
					continue;
				}
				newParam.find(".ciq-heading").text(parameter.heading);
				newParam[0].setAttribute("fieldname", parameter.name);
				var swatch = newParam.find("cq-swatch");
				var paramInput = document.createElement("input");
				var pAttr;
				var setSwatch = false;
				var attributes = {};
				if (parameter.defaultValue.constructor == Boolean) {
					paramInput.setAttribute("type", "checkbox");
					if (parameter.value) paramInput.checked = true;
					this.setChangeEvent(
						paramInput,
						"parameters",
						parameter.name + "Enabled"
					);
					swatch.remove();

					attributes = this.helper.attributes[parameter.name + "Enabled"];
					for (pAttr in attributes)
						if (pAttr !== "hidden")
							paramInput.setAttribute(pAttr, attributes[pAttr]);
				} else if (parameter.defaultValue.constructor == String) {
					var paramName = parameter.name;
					if (parameter.defaultColor) {
						newParam[0].initialize({
							DescriptionDialog: this,
							parameter: parameter.name + "Color",
							params: params
						});
						setSwatch = true;
						paramName = paramName + "Value";
					} else {
						swatch.remove();
					}
					if (parameter.options) {
						paramInput = this.makeMenu(
							paramName,
							parameter.value,
							parameter.options,
							"parameters"
						);
					} else {
						paramInput.value = parameter.value;
					}
					attributes = this.helper.attributes[paramName];
					for (pAttr in attributes)
						if (pAttr !== "hidden")
							paramInput.setAttribute(pAttr, attributes[pAttr]);
				} else if (parameter.defaultValue.constructor == Number) {
					paramInput.setAttribute("type", "number");
					paramInput.value = parameter.value;
					this.setChangeEvent(
						paramInput,
						"parameters",
						parameter.name + "Value"
					);
					newParam[0].initialize({
						DescriptionDialog: this,
						parameter: parameter.name + "Color",
						params: params
					});
					setSwatch = true;

					attributes = this.helper.attributes[parameter.name + "Value"];
					for (pAttr in attributes) {
						var pAttrVal = attributes[pAttr];
						// poor IE/Edge can't perform decimal step validation properly, so we need to change step to any and give up the neat step effect
						if (
							(CIQ.isIE || CIQ.isEdge) &&
							pAttr == "step" &&
							Math.floor(pAttrVal) != pAttrVal
						)
							pAttrVal = "any";
						if (pAttr !== "hidden") paramInput.setAttribute(pAttr, pAttrVal);
					}
				} else continue;

				if (attributes && attributes.hidden) newParam.not("hr").hide();
				newParam.find(".stx-data").append(paramInput);

				newParam[0].originalOuterHTML = newParam[0].outerHTML;
				var oldParam = parameters.find("[fieldname='" + parameter.name + "']");
				if (!oldParam.length) {
					parameters.append(newParam);
				} else if (
					oldParam[0].originalOuterHTML !== newParam[0].originalOuterHTML
				) {
					oldParam[0].replaceWith(newParam[0]);
				}
				if (setSwatch) swatch[0].setColor(parameter.color, false); // don't percolate
			}
		}

		/**
		 * Sets up a handler to process changes to input fields
		 * @param {HTMLElement} node    The input field
		 * @param {string} section The section that is being updated, "inputs","outputs","parameters"
		 * @param {string} name    The name of the field being updated
		 * @memberof! WebComponents.cq-study-dialog
		 * @private
		 */
		setChangeEvent(node, section, name) {
            console.log("setChangeEvent");
			var self = this;
			function closure() {
				return function () {
					var updates = {};
					updates[section] = {};
					updates[section][name] = this.value;
					if (this.type == "checkbox" || this.type == "radio") {
						updates[section][name] = this.checked;
					}
					self.updateStudy(updates);
				};
			}
			node.addEventListener("change", closure());
		}

		setContext(context) {
            console.log("setContext");
			this.context = context;
			context.advertiseAs(this, "DescriptionDialog");
		}

		/**
		 * Accepts new menu (select box) selections
		 * @param {object} activator
		 * @param {string} section within the dialog ("inputs", "outputs", "parameters")
		 * @memberof! WebComponents.cq-study-dialog
		 * @since 5.2.0 Added `section` parameter.
		 */
		setSelectOption(activator, section) {
            console.log("setSelectOption");
			var node = CIQ.UI.$(activator.node);
			var name = node.attr("name");
			var value = node.attr("value");
			var newInput = node[0].cqMenuWrapper;
			newInput.fieldValue = value;
			var inputValue = newInput.querySelector("cq-selected");
			if (inputValue) inputValue.innerText = this.helper.stx.translateIf(value);
			if (!section) section = "inputs";
			var updates = {};
			updates[section] = {};
			updates[section][name] = value;
			this.updateStudy(updates);
		}

		updateStudy(updates) {
            console.log("updateStudy");
			if (this.node.find(":invalid").length) return;
			if (this.addWhenDone) {
				CIQ.extend(this.queuedUpdates, updates);
				return;
			}
			if (this.helper.libraryEntry.deferUpdate) {
				CIQ.extend(this.queuedUpdates, { inputs: updates.inputs });
				this.helper.updateStudy({
					outputs: updates.outputs,
					parameters: updates.parameters
				});
			} else {
				this.helper.updateStudy(updates);
			}
		}

		/**
		 * Selects template elements and attaches them as class properties only once
		 * @memberof! WebComponents.cq-study-dialog
		 */
		selectTemplates() {
            console.log("selectTemplates");
			if (this.inputTemplate) return;
			this.inputTemplate = this.querySelector("template[cq-study-input]");
			this.outputTemplate = this.querySelector("template[cq-study-output]");
			this.parameterTemplate = this.querySelector(
				"template[cq-study-parameters]"
			);
		}
	}

	DescriptionDialog.markup = `
    <h4 class="title">Study here</h4>
		<cq-scroll cq-no-maximize>
			<cq-study-inputs>
				<template cq-study-input>
					<cq-study-input>
						<div class="ciq-heading"></div>
						<div class="stx-data">
							<template cq-menu>
								<cq-menu class="ciq-select">
									<cq-selected></cq-selected>
									<cq-menu-dropdown cq-lift></cq-menu-dropdown>
								</cq-menu>
							</template>
						</div>
					</cq-study-input>
					
				</template>
			</cq-study-inputs>
			<cq-study-outputs>
				<template cq-study-output>
					<cq-study-output>
						<div class="ciq-heading"></div>
						<cq-swatch cq-overrides="auto"></cq-swatch>
					</cq-study-output>
					
				</template>
			</cq-study-outputs>
			<cq-study-parameters>
				<template cq-study-parameters>
					<cq-study-parameter>
						<div class="ciq-heading"></div>
						<div class="stx-data"><cq-swatch cq-overrides="auto"></cq-swatch>
							<template cq-menu>
								<cq-menu class="ciq-select">
									<cq-selected></cq-selected>
									<cq-menu-dropdown cq-lift></cq-menu-dropdown>
								</cq-menu>
							</template>
						</div>
					</cq-study-parameter>
					<hr>
				</template>
			</cq-study-parameters>
		</cq-scroll>
		<div class="ciq-dialog-cntrls">
			<div class="ciq-btn" stxtap="close()">Done</div>
		</div>
	`;
	CIQ.UI.addComponentDefinition("cq-description-dialog", DescriptionDialog);
}


}


export {__js_webcomponents_DescriptionContext_}
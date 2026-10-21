import { CIQ } from '@/components/common/chart/st-development/js/components'
import {__js_advanced_studies_accumulationDistribution_} from "../advance/studies/accumulationDistribution.js"
import {__js_advanced_studies_adx_} from "../advance/studies/adx.js"
import {__js_advanced_studies_alligator_} from "../advance/studies/alligator.js"
import {__js_advanced_studies_atr_} from "../advance/studies/atr.js"
import {__js_advanced_studies_awesomeOscillator_} from "../advance/studies/awesomeOscillator.js"
import {__js_advanced_studies_balanceOfPower_} from "../advance/studies/balanceOfPower.js"
import {__js_advanced_studies_bollinger_} from "../advance/studies/bollinger.js"
import {__js_advanced_studies_cci_} from "../advance/studies/cci.js"
import {__js_advanced_studies_centerOfGravity_} from "../advance/studies/centerOfGravity.js"
import {__js_advanced_studies_chaikin_} from "../advance/studies/chaikin.js"
import {__js_advanced_studies_chande_} from "../advance/studies/chande.js"
import {__js_advanced_studies_coppock_} from "../advance/studies/coppock.js"
import {__js_advanced_studies_detrended_} from "../advance/studies/detrended.js"
import {__js_advanced_studies_disparity_} from "../advance/studies/disparity.js"
import {__js_advanced_studies_easeOfMovement_} from "../advance/studies/easeOfMovement.js"
import {__js_advanced_studies_ehlerFisher_} from "../advance/studies/ehlerFisher.js"
import {__js_advanced_studies_elder_} from "../advance/studies/elder.js"
import {__js_advanced_studies_fractalChaos_} from "../advance/studies/fractalChaos.js"
import {__js_advanced_studies_highLowStudies_} from "../advance/studies/highLowStudies.js"
import {__js_advanced_studies_intradayMomentum_} from "../advance/studies/intradayMomentum.js"
import {__js_advanced_studies_keltner_} from "../advance/studies/keltner.js"
import {__js_advanced_studies_klinger_} from "../advance/studies/klinger.js"
import {__js_advanced_studies_linearRegression_} from "../advance/studies/linearRegression.js"
import {__js_advanced_studies_macd_} from "../advance/studies/macd.js"
import {__js_advanced_studies_massIndex_} from "../advance/studies/massIndex.js"
import {__js_advanced_studies_moneyFlow_} from "../advance/studies/moneyFlow.js"
import {__js_advanced_studies_movingAverages_} from "../advance/studies/movingAverages.js"
import {__js_advanced_studies_parabolicSAR_} from "../advance/studies/parabolicSAR.js"
import {__js_advanced_studies_priceMomentumOscillator_} from "../advance/studies/priceMomentumOscillator.js"
import {__js_advanced_studies_priceVolumeOscillator_} from "../advance/studies/priceVolumeOscillator.js"
import {__js_advanced_studies_primeNumber_} from "../advance/studies/primeNumber.js"
import {__js_advanced_studies_pring_} from "../advance/studies/pring.js"
import {__js_advanced_studies_psychologicalLine_} from "../advance/studies/psychologicalLine.js"
import {__js_advanced_studies_qstick_} from "../advance/studies/qstick.js"
import {__js_advanced_studies_rainbow_} from "../advance/studies/rainbow.js"
import {__js_advanced_studies_relativeVigor_} from "../advance/studies/relativeVigor.js"
import {__js_advanced_studies_rsi_} from "../advance/studies/rsi.js"
import {__js_advanced_studies_schaffTrendCycle_} from "../advance/studies/schaffTrendCycle.js"
import {__js_advanced_studies_stochastics_} from "../advance/studies/stochastics.js"
import {__js_advanced_studies_swingIndex_} from "../advance/studies/swingIndex.js"
import {__js_advanced_studies_trendIntensity_} from "../advance/studies/trendIntensity.js"
import {__js_advanced_studies_twiggsMoneyFlow_} from "../advance/studies/twiggsMoneyFlow.js"
import {__js_advanced_studies_typicalPrice_} from "../advance/studies/typicalPrice.js"	// excluded
import {__js_advanced_studies_ulcerIndex_} from "../advance/studies/ulcerIndex.js"
import {__js_advanced_studies_ultimateOscillator_} from "../advance/studies/ultimateOscillator.js"
import {__js_advanced_studies_volatilityIndex_} from "../advance/studies/volatilityIndex.js"
import {__js_advanced_studies_volumeStudies_} from "../advance/studies/volumeStudies.js"
import {__js_advanced_studies_williamsMFI_} from "../advance/studies/williamsMFI.js"

let extendOverwrite = () => {
if (!CIQ.Studies) {
	console.error(
		"movingAverages feature requires first activating studies feature."
	);
} else {
	/**
	 * 覆写所有calculation function以适配dual symbol的加载逻辑
	 * 这是考虑到了原生chartiq大部分Tech不存在支持在另一个field计算显示的代码
	 * 这块代码不写在STOverwriteStudies是因为生命周期问题不生效
	 */
		CIQ.activateImports(
			__js_advanced_studies_accumulationDistribution_,
			__js_advanced_studies_adx_,
			__js_advanced_studies_alligator_,
			// Aroon (Excluded)
			__js_advanced_studies_atr_,
			__js_advanced_studies_awesomeOscillator_,
			__js_advanced_studies_balanceOfPower_,
			__js_advanced_studies_bollinger_,
			__js_advanced_studies_cci_,
			__js_advanced_studies_centerOfGravity_,
			__js_advanced_studies_chaikin_,
			__js_advanced_studies_chande_,
		    // Choppiness (Excluded)
			__js_advanced_studies_coppock_,
		    // Darvas Box (Excluded)
			__js_advanced_studies_detrended_,
			__js_advanced_studies_disparity_,
			__js_advanced_studies_easeOfMovement_,
			__js_advanced_studies_ehlerFisher_,
			__js_advanced_studies_elder_,
			__js_advanced_studies_fractalChaos_,
			__js_advanced_studies_highLowStudies_,
		    // Ichimoku (Excluded)
			__js_advanced_studies_intradayMomentum_,
			__js_advanced_studies_keltner_,
			__js_advanced_studies_klinger_,
			__js_advanced_studies_linearRegression_,
			__js_advanced_studies_macd_,
			__js_advanced_studies_massIndex_,
			__js_advanced_studies_moneyFlow_,
			__js_advanced_studies_movingAverages_,
			__js_advanced_studies_parabolicSAR_,
		    // PivotPoints (Excluded)
		    // Pretty Good Oscillators (Excluded)
			__js_advanced_studies_priceMomentumOscillator_,
			__js_advanced_studies_priceVolumeOscillator_,
			__js_advanced_studies_primeNumber_,
			__js_advanced_studies_pring_,
		    // projectedVolume (Excluded)
			__js_advanced_studies_psychologicalLine_,
			__js_advanced_studies_qstick_,
			__js_advanced_studies_rainbow_,
		    // RandomWalk (Excluded)
			__js_advanced_studies_relativeVigor_,
			__js_advanced_studies_rsi_,
			__js_advanced_studies_schaffTrendCycle_,
		    // Shinohara (Excluded)
			__js_advanced_studies_stochastics_,
		    // Supertrend (Excluded)
			__js_advanced_studies_swingIndex_,
			__js_advanced_studies_trendIntensity_,
		    // Trix (Excluded)
			__js_advanced_studies_twiggsMoneyFlow_,
			__js_advanced_studies_typicalPrice_,
			__js_advanced_studies_ulcerIndex_,
			__js_advanced_studies_ultimateOscillator_,
		    // Valuation Lines (Excluded)
			__js_advanced_studies_volatilityIndex_,
		    // Volume Profile (Excluded)
			__js_advanced_studies_volumeStudies_,
		    // Vortex Indicator (Excluded)
			__js_advanced_studies_williamsMFI_,
		)


	CIQ.Studies.studyLibrary = CIQ.extend(CIQ.Studies.studyLibrary, {

	});
}

};
export {extendOverwrite}

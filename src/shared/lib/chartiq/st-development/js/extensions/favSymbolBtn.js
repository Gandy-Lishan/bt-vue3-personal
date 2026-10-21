import { CIQ as _CIQ, timezoneJS as _timezoneJS } from "chartiq/js/chartiq.js";

let __st_js_favsymbol_btn_ = (_exports) => {
    /* global _CIQ, _timezoneJS, _SplinePlotter */
    var CIQ = typeof _CIQ !== "undefined" ? _CIQ : _exports.CIQ;
    
/**
 * add a symbol to favoriteList
 */
CIQ.addSymbolCookie = async function() {
	let favoriteSymbolList = CIQ.store.getters.getFavoriteSymbolList

	// if a symbol doesn't exist in list, switch button
	var div = document
		.querySelectorAll('.favBtnContainer')[0]
		.querySelectorAll('button')[0]

    div.classList.remove('addFav')	
    div.classList.add('delFav')
    div.innerHTML =
		"<div><svg t='1638255076868' class='button_icon' viewBox='0 0 1024 1024' version='1.1' xmlns='http://www.w3.org/2000/svg' p-id='2654' width='200' height='200'><path d='M885.942179 427.687756l-267.445168-22.933315-104.470353-246.470461L409.553235 404.75444l-267.336698 22.933315 202.846918 175.770236-60.789505 261.34524 229.753731-138.569986 229.859132 138.569986-60.785411-261.34524L885.942179 427.687756zM514.026658 656.403854l-139.875724 84.425831 37.038568-159.160953-123.591853-106.975407 162.91751-14.053064 63.511499-150.116973 63.620993 150.116973 162.860205 14.053064-123.534548 106.975407 37.038568 159.160953L514.026658 656.403854z' p-id='2655' fill='#FFFFFF'></path></svg><span>Remove from favorite symbols</span></div>"
    div.removeEventListener('click', _addSymbolHandler);
    div.removeEventListener('click', _delSymbolHandler);
    div.addEventListener('click', _delSymbolHandler);
        

	// filter redundant items
	if (favoriteSymbolList.indexOf(CIQ.stxx.chart.symbol) === -1) {
		favoriteSymbolList.push(CIQ.stxx.chart.symbol)

		await CIQ.store.dispatch('chart/update_favorite', {
			indicator: JSON.stringify(CIQ.store.getters.getFavoriteIndicatorList),
			symbol: JSON.stringify(favoriteSymbolList)
		})
	}
}

/**
 * remove a symbol from favoriteList
 */
CIQ.delSymbolCookie = async function() {
	let favoriteSymbolList = CIQ.store.getters.getFavoriteSymbolList

	for (var item in favoriteSymbolList) {
		if (favoriteSymbolList[item] == CIQ.stxx.chart.symbol) {
			favoriteSymbolList.splice(item, 1)
		}
	}
	var div = document
		.querySelectorAll('.favBtnContainer')[0]
		.querySelectorAll('button')[0]

    div.classList.remove('delFav')	
    div.classList.add('addFav')
    div.innerHTML =
		"<div><svg t='1638255076868' class='button_icon' viewBox='0 0 1024 1024' version='1.1' xmlns='http://www.w3.org/2000/svg' p-id='2654' width='200' height='200'><path d='M885.942179 427.687756l-267.445168-22.933315-104.470353-246.470461L409.553235 404.75444l-267.336698 22.933315 202.846918 175.770236-60.789505 261.34524 229.753731-138.569986 229.859132 138.569986-60.785411-261.34524L885.942179 427.687756zM514.026658 656.403854l-139.875724 84.425831 37.038568-159.160953-123.591853-106.975407 162.91751-14.053064 63.511499-150.116973 63.620993 150.116973 162.860205 14.053064-123.534548 106.975407 37.038568 159.160953L514.026658 656.403854z' p-id='2655' fill='#1296db'></path></svg><span>Add to favorite symbols</span></div>"
    div.removeEventListener('click', _delSymbolHandler);
    div.removeEventListener('click', _addSymbolHandler);
    div.addEventListener('click', _addSymbolHandler);
        

	await CIQ.store.dispatch('chart/update_favorite', {
		indicator: JSON.stringify(CIQ.store.getters.getFavoriteIndicatorList),
		symbol: JSON.stringify(favoriteSymbolList)
	})
}
const _addSymbolHandler = async function () {
	await CIQ.addSymbolCookie();
};
const _delSymbolHandler = async function () {
	await CIQ.delSymbolCookie();
};

}
export { __st_js_favsymbol_btn_ }
/***
 * A simple observer pattern implementation.
 */
function EventHelper() {
	this.handlers = [];
	
	this.subscribe = function(fn) {
		this.handlers.push(fn);
	}
	
	this.notify = function(args) {
		for (var i = 0; i < this.handlers.length; i++) {
			this.handlers[i].call(this, args);
		}
	}
	
	return this;
}
	


/***
 * A sample Model implementation.
 * Provides a filtered view of the underlying data.
 * 
 * Relies on the data item having an "id" property uniquely identifying it.
 */
function DataView() {
	var self = this;
	
	// private
	var items = [];			// data by index
	var rows = [];			// data by row
	var idxById = {};		// indexes by id
	var rowsByIdx = [];		// rows by index
	var filter = null;		// filter function
	var updated = null; 	// updated item ids
	var suspend = false;	// suspends the recalculation
	
	var pagesize = 0;
	var pagenum = 0;
	var totalRows = 0;
	
	// events
	var onRowCountChanged = new EventHelper();
	var onRowsChanged = new EventHelper();
	var onPagingInfoChanged = new EventHelper();
	
	
	function beginUpdate() {
		suspend = true;
	}
	
	function endUpdate() {
		suspend = false;
		refresh();
	}
	
	function setItems(data) {
		items = data.concat();
		refresh();
	}
	
	function setPagingOptions(args) {
		if (args.pageSize != undefined)
			pagesize = args.pageSize;
			
		if (args.pageNum != undefined)
			pagenum = Math.min(args.pageNum, Math.ceil(totalRows/pagesize));

		onPagingInfoChanged.notify(getPagingInfo());

		refresh();
	}
	
	function getPagingInfo() {
		return {pageSize:pagesize, pageNum:pagenum, totalRows:totalRows};
	}
	
	function sort(comparer) {
		items.sort(comparer);
		refresh();
	}
	
	function setFilter(filterFn) {
		filter = filterFn;
		refresh();
	}
	
	function getIdxById(id) {
		return idxById[id];
	}
	
	function getRowById(id) {
		return rowsByIdx[idxById[id]];
	}
	
	function getItemById(id) {
		return items[idxById[id]];
	}
	
	function updateItem(id,item) {
		items[idxById[id]] = item;
		if (!updated) updated = {};
		updated[id] = true;
		refresh();
	}
	
	function insertItem(insertBefore,item) {
		items.splice(insertBefore,0,item);
		refresh();
	}
	
	function addItem(item) {
		items.push(item);
		refresh();
	}
	
	function deleteItem(id) {
		items.splice(idxById[id],1);
		refresh();
	}
	
	function recalc() {
		var diff = [];
		idxById = {};
		rowsByIdx = [];
		
		// go over all items remapping them to rows on the fly 
		// while keeping track of the differences and updating indexes
		var rl = rows.length;
		var currentRowIndex = 0;
		var currentPageIndex = 0;
		var item,id;

		for (var i=0, il=items.length; i<il; i++) {
			item = items[i];
			id = item.id;

			if (id == undefined || idxById[id] != undefined)
				throw "Each data element must implement a unique 'id' property";

			idxById[id] = i;

			if (!filter || filter(item)) {
				if (!pagesize || (currentRowIndex >= pagesize * pagenum && currentRowIndex < pagesize * (pagenum + 1))) {
				
					if (currentPageIndex >= rl || id != rows[currentPageIndex].id || (updated && updated[id])) {
						diff.push(currentPageIndex);
					}
					
					rows[currentPageIndex] = item;
					rowsByIdx[i] = currentPageIndex++;
				}
				
				currentRowIndex++;
			}
		}
		
		if (rl > currentPageIndex)
			rows.splice(currentPageIndex, rl - currentPageIndex);

		
		totalRows = currentRowIndex;
		updated = null;
		
		return diff;
	}
	
	function refresh() {
		if (suspend) return;
		
		var countBefore = rows.length;
		var totalRowsBefore = totalRows;
		var diff = recalc();
		
		// if the current page is no longer valid, go to last page and recalc
		// we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
		if (pagesize && totalRows < pagenum*pagesize)
		{
			pagenum = Math.floor(totalRows/pagesize);
			diff = recalc();
		}
		
		if (totalRowsBefore != totalRows) onPagingInfoChanged.notify(getPagingInfo());
		if (countBefore != rows.length) onRowCountChanged.notify({previous:countBefore, current:rows.length});
		if (diff.length > 0 || countBefore != rows.length) onRowsChanged.notify(diff);
	}
	

	
	return {
		// properties
		"rows":			rows,			// note: neither the array or the data in it should be modified directly
		
		// methods
		"beginUpdate":	beginUpdate,	
		"endUpdate":	endUpdate,
		"setPagingOptions":	setPagingOptions,
		"getPagingInfo": getPagingInfo,
		"setItems":		setItems,
		"setFilter":	setFilter,
		"sort":			sort,
		"getIdxById":	getIdxById,
		"getRowById":	getRowById,
		"getItemById":	getItemById,
		"refresh":		refresh,
		"updateItem":	updateItem,
		"insertItem":	insertItem,
		"addItem":		addItem,
		"deleteItem":	deleteItem,
		
		// events
		"onRowCountChanged":	onRowCountChanged,
		"onRowsChanged":		onRowsChanged,
		"onPagingInfoChanged":	onPagingInfoChanged
	};
}

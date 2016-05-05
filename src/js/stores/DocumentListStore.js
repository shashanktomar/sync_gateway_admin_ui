import Store from './Store'

import { fetchDocs, fetchDoc, deleteDoc } from '../api';

class DocumentListStore extends Store {
  constructor() {
    super();
    this.data = this._getInitData();
  }
  
  _getInitData() {
    return {
      pageSize: 10,
      rows: [ ],
      curPage: 0,
      startKeys: [ ],
      isFetching: false,
      isDeleting: false,
      error: undefined,
      searchDocId: undefined,
      allRowsSelected: { }, // { <page-index>: <true|undefined> }
      selectedRows: { }     // { <page-index>: { <row.id> : <row.value.rev> } }
    }
  }
  
  reset() {
    this.setData(data => {
      return this._getInitData();
    });
  }
  
  fetchDocuments(db, pageOffset) {
    const { pageSize, curPage, startKeys } = this.data;
    const page = curPage + pageOffset;
    const startKey = (startKeys && page) && startKeys[page];

    this._updateFetchStatus(true);
    fetchDocs(db, pageSize, curPage, startKey)
      .then(result => {
        this._updateFetchStatus(false);
        this._updateRows(page, result.data.rows);
      }).catch(error => {
        this._updateFetchStatus(false, error);
      });
  }
  
  _updateFetchStatus(isFetching, error) {
    this.setData(data => {
      return Object.assign({ }, data, { isFetching, error });
    })
  }
  
  _updateRows(page, rows) {
    const { pageSize, startKeys } = this.data;
    let displayRows = rows;
    let newStartKeys = [ ];
    if (displayRows) {
      if (page === 0) {
        if (displayRows.length > 0)
          newStartKeys = [ undefined ];
      } else {
        newStartKeys = startKeys.slice(0, page);
        if (displayRows.length > 0)
          newStartKeys.push(displayRows[0].id);
      }
      
      if (displayRows.length > pageSize) {
        newStartKeys.push(displayRows[pageSize].id);
        displayRows = displayRows.slice(0, -1);
      }
    }
    
    this.setData(data => {
      return Object.assign({ }, data, { 
        rows: displayRows, 
        curPage: page, 
        startKeys: newStartKeys });
    });
    
    this._validateSelectedRows(page, displayRows);
  }
  
  _validateSelectedRows(curPage, rows) {
    let { selectedRows, allRowsSelected } = this.data;
    let selectedMap = selectedRows[curPage] || { };
     
    const curSelectedRowIds = Object.getOwnPropertyNames(selectedMap);
    if (curSelectedRowIds.length > 0) {
      const rowIds = new Set();
      rows.forEach(row => {
        rowIds.add(row.id);
      });
      
      let newSelectedMap;
      
      // Remove the selected rows that do not exist on the page anymore:
      curSelectedRowIds.forEach(selectedRowId => {
        if (!rowIds.has(selectedRowId)) {
          if (!newSelectedMap)
            newSelectedMap = Object.assign({ }, selectedMap);
          newSelectedMap[selectedRowId] = undefined;
        }
      });
      
      if (newSelectedMap) {
        selectedRows = Object.assign({ }, selectedRows, { 
          [curPage]: newSelectedMap 
        });
        
        // Reset all-row-checked status:
        if (allRowsSelected[curPage] !== undefined) {
          allRowsSelected = Object.assign({ }, allRowsSelected, { 
            [curPage]: undefined 
          })
        }
        
        this.data(data => {
          return Object.assign({ }, data, { selectedRows, allRowsSelected } );
        }); 
      }
    }
  }
  
  searchDocumentById(db, docId) {
    this._setSearchDocId(docId);
    this._updateFetchStatus(true);
    fetchDoc(db, docId)
      .then(result => {
        this._updateFetchStatus(false);
        const rows = this._createRowsFromDoc(result.data);
        this._updateRows(0, rows);
      }).catch(error => {
        this.setData(data => {
          return this._getInitData();
        });
        this._updateFetchStatus(false, error);
      });
  }
  
  _setSearchDocId(searchDocId) {
    this.setData(data => {
      return Object.assign({ }, data, { searchDocId });
    })
  }
  
  _createRowsFromDoc(doc) {
    const row = {
      key: doc._id,
      id: doc._id,
      value: {
        rev: doc._rev,
        doc  
      }
    }
    return [ row ];
  }
  
  selectAllRows(checked) {
    let { curPage, rows, allRowsSelected, selectedRows } = this.data;
    
    if (checked) {
      const selectedMap = { };
      for (const row of rows) {
        selectedMap[row.id] = row.value.rev;
      }
      
      selectedRows = Object.assign({ }, selectedRows, { 
        [curPage]: selectedMap 
      });
    } else {  
      selectedRows = Object.assign({ }, selectedRows, { 
        [curPage]: undefined 
      });
    }
    
    allRowsSelected = Object.assign({ }, allRowsSelected, {
      [curPage]: checked ? true : undefined
    });
    
    this.setData(data => {
      return Object.assign({ }, data, { allRowsSelected, selectedRows });
    });
  }
  
  selectRow(rowIndex, checked) {
    let { curPage, rows, selectedRows } = this.data;
    
    const row = rows[rowIndex];
    let selectedMap = Object.assign({ }, selectedRows[curPage], {
      [row.id]: (checked ? row.value.rev : undefined)
    });
    
    selectedRows = Object.assign({ }, selectedRows, { 
      [curPage]: selectedMap  
    });
    
    this.setData(data => {
      return Object.assign({ }, data, { selectedRows });
    });
  }
  
  deleteSelectedRows(db) {
    const { curPage, selectedRows } = this.data;
    const selectedMap = selectedRows[curPage];
    
    let deleteDocs = Object.keys(selectedMap).map(docId => {
      const revId = selectedMap[docId];
      return deleteDoc(db, docId, revId);
    });
    
    this._updateDeleteStatus(true);
    Promise.all(deleteDocs)
      .then(results => {
        this._updateDeleteStatus(false);
        this.fetchDocuments(db, 0);
      }).catch(error => {
        this._updateDeleteStatus(false, error);
      });
  }
  
  _updateDeleteStatus(isDeleting, error) {
    this.setData(data => {
      return Object.assign({ }, data, { isDeleting, error });
    });
  }
}

const instance = new DocumentListStore();
export default instance;
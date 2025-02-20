const createUpdateTableQuery = (table, colsObj, id) => {
    // returns 2 things
    // 1. Full query
    // 2. Array of input values
    for (const col of Object.keys(colsObj)) {
        if (!colsObj[col]) {
            delete colsObj[col];
        }
    }

    // Split the object into two arrays: 1 for keys, 1 for values. This is needed to build the query string
    const updateColsArr = Object.keys(colsObj);
    const updateValsArr = Object.values(colsObj);

    if (updateColsArr.length > 0) {
        let columnCount = 0;
        let updateColsStr = "";
    
        for (const col of updateColsArr) {
            columnCount += 1;
            updateColsStr += `${col} = $${columnCount.toString()}${(columnCount === updateColsArr.length) ? "" : `,
                `}`
        }
    
        const tableUpdateQuery = `
            UPDATE ${table}
            SET ${updateColsStr}
            WHERE id = $${(columnCount + 1).toString()}
            RETURNING id;
        `;
    
        // add the table row's id so that the array can be used in the .query argument
        updateValsArr.push(id);
        
        return { tableUpdateQuery, updateValsArr }

    } else {
        return null
    }
}

module.exports = createUpdateTableQuery;
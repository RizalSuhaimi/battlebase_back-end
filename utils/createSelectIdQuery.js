const createSelectIdQuery = (table, colsObj) => {
    const matchColsArr = Object.keys(colsObj);
    const matchValsArr = Object.values(colsObj);

    let columnCount = 0;
    let matchColsStr = "";

    for (const col of matchColsArr) {
        columnCount += 1;
        matchColsStr += `${col} = $${columnCount.toString()}${(columnCount === matchColsArr.length) ? "" : `
            AND `}`
    }

    const row_idQuery = `
        SELECT id
        FROM ${table}
        WHERE ${matchColsStr}`;

    return { row_idQuery, matchValsArr };
};

module.exports = createSelectIdQuery;
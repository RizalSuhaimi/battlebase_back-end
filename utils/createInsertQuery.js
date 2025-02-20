const createInsertQuery = (table, colsObj) => {
    const colsArr = Object.keys(colsObj);
    const valsArr = Object.values(colsObj);

    let columnCount = 0;
    let colsStr = "";
    let valsStr = "";

    for (const col of colsArr) {
        columnCount += 1;
        colsStr += `${col}${(columnCount === colsArr.length) ? "" : `,
            `}`
        valsStr += `$${columnCount.toString()}${(columnCount === colsArr.length) ? "" : `, `}`
    }

    const insertQuery = `
        INSERT INTO ${table} (${colsStr})
        VALUES (${valsStr})
        RETURNING id`;

    return { insertQuery, valsArr };
};

module.exports = createInsertQuery;
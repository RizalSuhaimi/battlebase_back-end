const pool = require("../config/db");
const bcrypt = require("bcrypt");

const updateTable = (
    colsObj
) => {
    // returns 2 things
    // 1. Full query
    // 2. Array of input values
}

const usersColsObj = {
    name, 
    username, 
    email, 
    hash, 
    phone, 
    seller,
    address_id
};

for (const col of Object.keys(usersColsObj)) {
    if (!usersColsObj[col]) {
        delete usersColsObj[col];
    }
}

// Split the object into two arrays: 1 for keys, 1 for values. This is needed to build the query string
const updateUsersColsArr = Object.keys(usersColsObj);
const updateUsersValsArr = Object.values(usersColsObj);

if (updateUsersColsArr.length !== 0) {
    let columnCount = 0;
    let updateColsStr = "";

    for (const col of updateUsersColsArr) {
        columnCount += 1;
        updateColsStr += `${col} = $${columnCount.toString()}${(columnCount === updateUsersColsArr.length) ? "" : `,
            `}`
    }

    const usersUpdateQuery = `
        UPDATE users
        SET ${updateColsStr}
        WHERE id = $${(columnCount + 1).toString()};
    `;

    // add the user's id to the end of the array of values
    updateUsersValsArr.push(req.user.id)

    await client.query(
        usersUpdateQuery, 
        updateUsersValsArr
    );
}
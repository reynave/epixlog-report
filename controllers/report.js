require('dotenv').config();
const express = require('express');
const router = express.Router();
const sql = require('msnodesqlv8');
const connectionString = "Driver={" + process.env.SQL_DRIVE + "};Server=" + process.env.SQL_SERVER + ";Database=" + process.env.SQL_DATABASE + ";Trusted_Connection=yes;";

const prefix = 'dbo.';

// Fungsi untuk menjalankan query dengan promise
const runQuery = (query) => {
   return new Promise((resolve, reject) => {
      sql.query(connectionString, query, (err, rows) => {
         if (err) {
            reject(err);
         } else {
            resolve(rows);
         }
      });
   });
};

router.get('/', async (req, res) => {
   try {

      let month = 7;
      let year = 2024;
      let StockTake_Month = month - 1;

      const get = {
         StockTake_Month: StockTake_Month,
         month: month,
         year: year
      }
      const q = `
       SELECT i.Material_ID, i.PackUnit, i.Qty_In, i.DateCreated,   i.RowNum
       FROM (
           SELECT *,
               ROW_NUMBER() OVER (PARTITION BY Material_ID ORDER BY DateCreated DESC) AS RowNum
           FROM Inventory
           WHERE Document_Type != 'StokeTake'
       ) AS i
       WHERE i.RowNum = 1
       AND (CAST(DateCreated AS date) <= GETDATE())
       `;

      // Jalankan query pertama
      const rows = await runQuery(q);
      let unitPrice = [];

      // Loop melalui hasil query pertama
      for (let i = 0; i < rows.length; i++) {
         const row = rows[i];
         const q2 = ` 
            SELECT top 1 s.Material_ID,  m.Material_Desc1, m.Material_Desc2, u.UOM_Desc1,
            s.PackUnit,  s.Convertion,  s.UnitPrice, s.DateCreated
            FROM Supplier_Material_Link as s
            left join Material as m on m.Material_ID = s.Material_ID 
            join UOM as u on u.UOM_ID = s.PackUnit
           WHERE s.Material_ID = '${row.Material_ID}' AND s.PackUnit =  '${row.PackUnit}'
           ORDER BY s.DateCreated DESC
           `;
         const supplierRows = await runQuery(q2);


         const supplier = supplierRows[0] || {};

         const newData = {
            Material_ID: row['Material_ID'],
            Material_Desc1: supplier['Material_Desc1'] || null,
            PackUnit: row['PackUnit'],
            BaseUnit: row['BaseUnit'],
            UOM_Desc: supplier['UOM_Desc1'],

            Qty_In: row['Qty_In'],
            DateCreated: row['DateCreated'],
            Convertion: supplier['Convertion'] || 1, // default to 1 if undefined
            UnitPrice: supplier['UnitPrice'] || 0,   // default to 0 if undefined
            price: supplier['UnitPrice'] && supplier['Convertion']
               ? supplier['UnitPrice'] / supplier['Convertion']
               : 0 // set price to 0 if either UnitPrice or Convertion is undefined
         };
         unitPrice.push(newData);
      }

      const qBeginningStock = `
      select b.* , 'BeginningStock' as 'field' from (
         select a.Material_ID, sum(a.TotalPack_Qty_InHand)  as 'beginningStock',   a.PackUnit
         from 
         ( 
            select d.Material_ID, d.StockTake_ID, s.StockTake_Month,
            sum(d.Pack_StockTake_Qty) as 'TotalPack_Qty_InHand',  d.PackUnit,
            year((CAST(s.DateCreated AS date))) as 'year'
            from StockTake_Details as d
            join StockTake as s on s.StockTake_ID = d.StockTake_ID
            where StockTake_Month = ${StockTake_Month}  and year((CAST(s.DateCreated AS date))) = ${year} 
            group by d.StockTake_ID, s.StockTake_Month, d.Material_ID,   d.PackUnit, year((CAST(s.DateCreated AS date)))
         ) as a 
         group by a.Material_ID,   a.PackUnit
         ) as b where b.beginningStock > 0;
      `;
      const beginningStock = await runQuery(qBeginningStock);
      // const beginningStockObj = beginningStock.reduce((acc, material) => {
      //    const { Material_ID, ...rest } = material;
      //    acc[Material_ID] = rest;
      //    return acc;
      // }, {});



      const qInStock = `
      SELECT a.Material_ID,  sum(a.materialTotalAmount) as 'materialTotalAmount', a.PackUnit, 'InStock' as 'field' from (

      SELECT  d.Material_ID, d.PackUnit,
         sum(d.MaterialTotalAmount) as 'materialTotalAmount' , 'MR_GRN' as 'table'
         from MR_GRN_Details as d
         left join MR_GRN as m on m.Tranx_ID = d.Tranx_ID
         where year((CAST(m.Received_Date AS date))) = ${year}  and  
         month((CAST(m.Received_Date AS date))) = ${month}
         group by d.Material_ID, d.PackUnit
            
      UNION ALL
         SELECT  d.Material_ID, d.PackUnit,
         sum(d.MaterialTotalAmount) as 'materialTotalAmount', 'DirectGRN' as 'table'
         from DirectGRN_Details as d
         left join DirectGRN as m on m.Tranx_ID = d.Tranx_ID
         where year((CAST(m.Received_Date AS date))) = ${year}  and  
         month((CAST(m.Received_Date AS date))) = ${month}
         group by d.Material_ID, d.PackUnit

         ) as a group by a.Material_ID, a.PackUnit
      `;
      const inStock = await runQuery(qInStock);



      const qEndingStock = ` 
      SELECT b.* from (
         select a.Material_ID,   a.PackUnit,  sum(a.Pack_StockTake_Qty)  as 'Pack_StockTake_Qty', sum(a.subTotal)  as 'subTotal'
         from 
         ( 
            select d.Material_ID, sum(d.Pack_StockTake_Qty ) as 'Pack_StockTake_Qty',
            sum(d.Pack_StockTake_Qty * d.Convertion) as 'subTotal',  d.PackUnit
            from StockTake_Details as d
            join StockTake as s on s.StockTake_ID = d.StockTake_ID
            where StockTake_Month = ${StockTake_Month}  and year((CAST(s.DateCreated AS date))) = ${year} 
            group by d.StockTake_ID, s.StockTake_Month, d.Material_ID,   d.PackUnit, year((CAST(s.DateCreated AS date)))
         ) as a 
         group by a.Material_ID,   a.PackUnit
         ) as b 
      where b.subTotal > 0  
      `;
      const endingStock = await runQuery(qEndingStock);


      const endingStockFinal = [];
      for (let i = 0; i < endingStock.length; i++) {
         const row = endingStock[i];

         const filteredItem = unitPrice.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );
         const newData = {
            Material_ID: row['Material_ID'],
            PackUnit: row['PackUnit'],
            total: row['subTotal'] * (filteredItem.length > 0 ? filteredItem[0].UnitPrice : 1),
            field : 'EndingStock',

         };
         endingStockFinal.push(newData);
      }


      const finalData = [];
      for (let i = 0; i < unitPrice.length; i++) {
         const row = unitPrice[i];


         const filteredItem = beginningStock.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );
         const filteredItem2 = inStock.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );
         const filteredItem3 = endingStockFinal.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );


         let valBeginningStock = filteredItem.length > 0 ? filteredItem[0].beginningStock : 0;
         let valIn = filteredItem2.length > 0 ? filteredItem2[0].materialTotalAmount : 0;
         let valEndingStock = filteredItem3.length > 0 ? filteredItem3[0].total : 0;

         let cogs = valBeginningStock + valIn - valEndingStock;

         const newData = {
            Material_ID: row['Material_ID'],
            Material_Desc1: row['Material_Desc1'] || null,
            PackUnit: row['PackUnit'],
            UOM_Desc: row['UOM_Desc'],

            Qty_In: row['Qty_In'],
            DateCreated: row['DateCreated'],
            Convertion: row['Convertion'],
            UnitPrice: row['UnitPrice'],
            price: row['price'],
            beginningStock: valBeginningStock,
            in: valIn,
            endingStock: valEndingStock,
            cogs: cogs,
         };
         finalData.push(newData);
      }


      res.json({
         error: false,
         get: get,
         unitPrice: unitPrice,
         //unitPriceObj: unitPriceObj,

         beginningStock: beginningStock,
         //beginningStockObj: beginningStockObj,

         inStock: inStock,
         //inStockObj :inStockObj,

         // endingStock :endingStock,
         endingStock: endingStockFinal,
         //endingStockObj: endingStockFinalObj,

         finalData: finalData,

      });
   } catch (err) {
      console.error('Error: ', err);
      res.json({
         error: true,
         message: err.message
      });
   }
});

module.exports = router;

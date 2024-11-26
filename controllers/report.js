require('dotenv').config();
const express = require('express');
const router = express.Router();
const sql = require('msnodesqlv8');
//const connectionString = "Driver={" + process.env.SQL_DRIVE + "};Server=" + process.env.SQL_SERVER + ";Database=" + process.env.SQL_DATABASE + ";Trusted_Connection=yes;";
const dbName = process.env.SQL_DATABASE;
const prefix = 'dbo.';

// Fungsi untuk menjalankan query dengan promise
const runQuery = (dbName, query) => {
   return new Promise((resolve, reject) => {
      //const connectionString = "Driver={" + process.env.SQL_DRIVE + "};Server=" + process.env.SQL_SERVER + ";Database=" + dbName + ";Trusted_Connection=yes;";
      //const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=epixbiz.marche.co.id,1435\\SERVER21;Database=EpixLOG_Mokka_Pluit;UID=sa;PWD=SQLserver123;"`;
      const connectionString = `
         Driver={${process.env.SQL_DRIVE}};
         Server=${process.env.SQL_SERVER};
         Database=${dbName};
         UID=${process.env.SQL_USER};
         PWD=${process.env.SQL_PASSWORD};
         Trusted_Connection=${process.env.SQL_TRUSTED_CONNECTION};
         Encrypt=${process.env.SQL_ENCRYPT};
       `;

      sql.query(connectionString, query, (err, rows) => {
         if (err) {
            reject(err);
         } else {
            resolve(rows);
         }
      });
   });
};


router.get('/test', async (req, res) => {
   console.log("test opk");
   try {
      const test = await runQuery('EpiqureIMS_Global', "select CURRENT_TIMESTAMP as 'success' ");
      res.json({
         error: false,
         connection: test,
         get: req.query,
      });
   } catch (err) {
      console.error('Error: ', err);
      const connectionString = `
      Driver={${process.env.SQL_DRIVE}};
      Server=${process.env.SQL_SERVER};
      Database=${dbName};
      UID=${process.env.SQL_USER};
      PWD=${process.env.SQL_PASSWORD};
      Encrypt=${process.env.SQL_ENCRYPT};
    `;

      res.json({
         error: true,
         connectionString: connectionString,
         message: err
      });
   }
});

router.get('/selectDb/', async (req, res) => {
   try {
      const q = `
         SELECT OutletDesc_1 as 'name', DB_Name 
         FROM OutletProfile 
         where OutletActivation = 0
         order by OutletDesc_1 ASC;
      `;

      // Jalankan query pertama
      const items = await runQuery('EpiqureIMS_Global', q);

      res.json({
         error: false,
         items: items
      });
   } catch (err) {
      console.error('Error: ', err);
      res.status(401).json({
         error: true,
         message: err.message
      });
   }
});


router.get('/result/', async (req, res) => {
   try {
      console.log(req.query.month);
      let month = req.query['month'] ? parseInt(req.query['month']) : 8;
      let year = req.query['year'] ? parseInt(req.query['year']) : 2024;
      let db = req.query['db'];


      let StockTake_Month = month - 1 == 0 ? 12 : month - 1;
      let StockTake_Year = StockTake_Month == 12 && month == 1 ? year - 1 : year;

      const get = {
         StockTake_Month: StockTake_Month,
         StockTake_Year: StockTake_Year,
         month: month,
         year: year
      }
      const q = `
       SELECT i.Material_ID, i.PackUnit, i.Qty_In, i.DateCreated,   i.RowNum, i.Document_Type
       FROM (
           SELECT *,
               ROW_NUMBER() OVER (PARTITION BY Material_ID, PackUnit ORDER BY DateCreated DESC) AS RowNum
           FROM Inventory
           WHERE Document_Type != 'StokeTake'
       ) AS i
       WHERE i.RowNum = 1
       AND (CAST(DateCreated AS date) <= GETDATE())
       `;

      // Jalankan query pertama
      const Inventory = await runQuery(db, q);
      let unitPrice = [];

      // Loop melalui hasil query pertama
      for (let i = 0; i < Inventory.length; i++) {
         const row = Inventory[i];
         const q2 = ` 
           SELECT top 1 
               s.Material_ID,  m.Material_Desc1, m.Material_Desc2, u.UOM_Desc1, s.BaseUnit, b.UOM_Desc1 as 'BaseUnitDesc', 
               s.PackUnit, s.Material_UnitCost as 'UnitPrice',
               s.DateCreated, '${row.Document_Type}' as 'Document_Type', 1 as 'Convertion'
            FROM Inventory as s
            left join Material as m on m.Material_ID = s.Material_ID 
            join UOM as u on u.UOM_ID = s.PackUnit
            join uom as b on b.UOM_ID = s.BaseUnit
            WHERE s.Material_ID = '${row.Material_ID}' AND s.PackUnit = '${row.PackUnit}' 
            and m.Material_Type = 0 and m.Material_Status = 0 and m.StockTake = 1
            ORDER BY s.DateCreated DESC;
         `;

         const q2Delete = ` 
            SELECT top 1 s.Material_ID,  m.Material_Desc1, m.Material_Desc2, u.UOM_Desc1, '${row.Document_Type}' as 'Document_Type',
            s.PackUnit,  s.Convertion,  s.UnitPrice,  s.DateCreated
            FROM Supplier_Material_Link as s
            left join Material as m on m.Material_ID = s.Material_ID 
            join UOM as u on u.UOM_ID = s.PackUnit
           WHERE s.Material_ID = '${row.Material_ID}' AND s.PackUnit =  '${row.PackUnit}'
           ORDER BY s.DateCreated DESC
         `;
         const supplierRows = await runQuery(db, q2);


         const supplier = supplierRows[0] || {};

         const newData = {
            Material_ID: row['Material_ID'],
            Material_Desc1: supplier['Material_Desc1'] || null,
            Document_Type: row['Document_Type'],
            PackUnit: row['PackUnit'],
            UOM_Desc: supplier['UOM_Desc1'],
            BaseUnit: supplier['BaseUnit'],
            BaseUnitDesc: supplier['BaseUnitDesc'],
            Qty_In: row['Qty_In'],
            DateCreated: row['DateCreated'],
            Convertion: supplier['Convertion'] || 1, // default to 1 if undefined
            Price: supplier['UnitPrice'] || 0,   // default to 0 if undefined
            UnitPrice: supplier['UnitPrice'] || 0,
            // UnitPrice: supplier['UnitPrice'] && supplier['Convertion']
            //    ? supplier['UnitPrice'] / supplier['Convertion']
            //    : 0  
         };
         unitPrice.push(newData);
      }

      const qBeginningStock = `
      SELECT b.* , 'BeginningStock' as 'field' from (
         SELECT a.Material_ID,  a.PackUnit,   sum(a.stockBegin) as 'stockBegin', sum(a.stockBeginConverting)  as 'stockBeginConverting'
         from 
         ( 
            SELECT d.Material_ID,  s.StockTake_Month, sum(d.Pack_StockTake_Qty) as 'stockBegin',
            sum(d.Pack_StockTake_Qty * d.Convertion) as 'stockBeginConverting', 
            d.PackUnit,
            year((CAST(s.DateCreated AS date))) as 'year'
            from StockTake_Details as d
            join StockTake as s on s.StockTake_ID = d.StockTake_ID
            where StockTake_Month = ${StockTake_Month}  and year((CAST(s.DateCreated AS date))) = ${StockTake_Year} 
            group by d.StockTake_ID, s.StockTake_Month, d.Material_ID,   d.PackUnit, year((CAST(s.DateCreated AS date)))
         ) as a 
         GROUP BY a.Material_ID,   a.PackUnit
      ) as b
      WHERE b.stockBegin > 0;

      `;
      const beginningStock = await runQuery(db, qBeginningStock);
      for (let i = 0; i < beginningStock.length; i++) {
         const row = beginningStock[i];
         const filteredItem = unitPrice.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );
         beginningStock[i]['UnitPrice'] = (filteredItem.length > 0 ? filteredItem[0].UnitPrice : 1);
         beginningStock[i]['priceBegin'] = beginningStock[i]['stockBeginConverting'] * (filteredItem.length > 0 ? filteredItem[0].UnitPrice : 1);
      }


      const qInStock = `
      SELECT a.Material_ID,  sum(a.materialTotalAmount) as 'materialTotalAmount',  sum(a.GRN ) as 'GRN',
          a.PackUnit, 'InStock' as 'field' 
      from (

         SELECT  d.Material_ID, d.PackUnit,  sum(d.MR_Qty ) as 'GRN',
            sum(d.MaterialTotalAmount) as 'materialTotalAmount' , 'MR_GRN' as 'table'
            from MR_GRN_Details as d
            left join MR_GRN as m on m.Tranx_ID = d.Tranx_ID
            where year((CAST(m.Received_Date AS date))) = ${year}  and  
            month((CAST(m.Received_Date AS date))) = ${month}
            group by d.Material_ID, d.PackUnit
            
         UNION ALL
            
         SELECT  d.Material_ID, d.PackUnit,   sum(d.qty ) as 'GRN',
            sum(d.MaterialTotalAmount) as 'materialTotalAmount', 'DirectGRN' as 'table'
            from DirectGRN_Details as d
            left join DirectGRN as m on m.Tranx_ID = d.Tranx_ID
            where year((CAST(m.Received_Date AS date))) = ${year}  and  
            month((CAST(m.Received_Date AS date))) = ${month}
            group by d.Material_ID, d.PackUnit 
      ) as a group by a.Material_ID, a.PackUnit
      `;
      const inStock = await runQuery(db, qInStock);



      const qEndingStock = ` 
      SELECT b.* , 'EndingStock' as 'field' from (
         SELECT a.Material_ID,  a.PackUnit,   sum(a.stockBegin) as 'stockBegin', sum(a.stockBeginConverting)  as 'stockBeginConverting'
         from 
         ( 
            SELECT d.Material_ID,  s.StockTake_Month, sum(d.Pack_StockTake_Qty) as 'stockBegin',
            sum(d.Pack_StockTake_Qty * d.Convertion) as 'stockBeginConverting', 
            d.PackUnit,
            year((CAST(s.DateCreated AS date))) as 'year'
            from StockTake_Details as d
            join StockTake as s on s.StockTake_ID = d.StockTake_ID
            where StockTake_Month = ${month}  and year((CAST(s.DateCreated AS date))) = ${year} 
            group by d.StockTake_ID, s.StockTake_Month, d.Material_ID,   d.PackUnit, year((CAST(s.DateCreated AS date)))
         ) as a 
         GROUP BY a.Material_ID, a.PackUnit
      ) as b
      WHERE b.stockBegin > 0;
      `;
      const endingStock = await runQuery(db, qEndingStock);


      for (let i = 0; i < endingStock.length; i++) {
         const row = endingStock[i];
         const filteredItem = unitPrice.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );
         endingStock[i]['UnitPrice'] = (filteredItem.length > 0 ? filteredItem[0].UnitPrice : 1);
         endingStock[i]['priceBegin'] = endingStock[i]['stockBeginConverting'] * (filteredItem.length > 0 ? filteredItem[0].UnitPrice : 1);
      }


      const total = {
         begin: {
            stock: 0,
            pricing: 0,
         },
         in: {
            stock: 0,
            pricing: 0,
         },
         end: {
            stock: 0,
            pricing: 0,
         },
         cogs: {
            stock: 0,
            pricing: 0,
         },
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
         const filteredItem3 = endingStock.filter(item =>
            item.Material_ID === row['Material_ID'] && item.PackUnit === row['PackUnit']
         );


         let valBeginningStock = filteredItem.length > 0 ? filteredItem[0].priceBegin : 0;

         let var_begin = {
            stock: filteredItem.length > 0 ? filteredItem[0].stockBegin : 0,
            pricing: filteredItem.length > 0 ? filteredItem[0].priceBegin : 0
         }
         let var_in = {
            stock: filteredItem2.length > 0 ? filteredItem2[0].GRN : 0,
            pricing: filteredItem2.length > 0 ? filteredItem2[0].materialTotalAmount : 0
         }
         let var_end = {
            stock: filteredItem3.length > 0 ? filteredItem3[0].stockBegin : 0,
            pricing: filteredItem3.length > 0 ? filteredItem3[0].priceBegin : 0
         }

         let var_cogs = {
            stock: var_begin.stock + var_in.stock - var_end.stock,
            pricing: var_begin.pricing + var_in.pricing - var_end.pricing,
         }

         const newData = {
            Material_ID: row['Material_ID'],
            Material_Desc1: row['Material_Desc1'] || null,
            Document_Type: row['Document_Type'],
            PackUnit: row['PackUnit'],
            UOM_Desc: row['UOM_Desc'],
            BaseUnitDesc: row['BaseUnitDesc'] || '-1',
            Qty_In: row['Qty_In'],
            DateCreated: row['DateCreated'],
            Convertion: row['Convertion'],
            UnitPrice: row['UnitPrice'],
            Price: row['Price'],
            beginningStock: valBeginningStock,

            begin: var_begin,
            in: var_in,
            end: var_end,
            cogs: var_cogs,
         };
       

         if (newData['BaseUnitDesc'] != '-1') { 
            finalData.push(newData);
            
            total.begin.stock += var_begin.stock;
            total.begin.pricing += var_begin.pricing;

            total.in.stock += var_in.stock;
            total.in.pricing += var_in.pricing;

            total.end.stock += var_end.stock;
            total.end.pricing += var_end.pricing;

            total.cogs.stock += var_cogs.stock;
            total.cogs.pricing += var_cogs.pricing;
         }
      }


      res.json({
         error: false,
         get: get,

         // beginningStock: beginningStock, 
         // inStock: inStock, 
         // endingStock :endingStock,
         // endingStock: endingStock,
         // unitPrice: unitPrice,
         finalData: finalData,
         total: total,
      });
   } catch (err) {
      console.error('Error: ', err);
      res.status(401).json({
         error: true,
         note: 'error DB',
         message: err.message
      });
   }
});

module.exports = router;

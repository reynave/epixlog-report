const sql = require('mssql/msnodesqlv8')

const connectionString = "Driver={ODBC Driver 17 for SQL Server};Server=WINDOWS-AN3885S\\SQLEXPRESS;Database=EpixLOG_Mokka_Pluit;Trusted_Connection=yes;";

const config = {
    server: "WINDOWS-AN3885S\\SQLEXPRESS",
    database: "EpixLOG_Mokka_Pluit",
   
    Trusted_Connection : true, 
    driver: "ODBC Driver 18 for SQL Server", // Required if using Windows Authentication
  };
  
  (async () => {
    try {
      await sql.connect(config);
      const result = await sql.query`SELECT * FROM dbo.Sales`;
      console.dir(result);
    } catch (err) {
      console.error(err);
    }
  })();
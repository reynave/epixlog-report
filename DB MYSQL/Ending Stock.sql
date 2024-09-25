 select b.* from (
	select a.Material_ID,   a.PackUnit,  sum(a.Pack_StockTake_Qty)  as 'Pack_StockTake_Qty', sum(a.subTotal)  as 'subTotal'
	from 
	( 
		select d.Material_ID, sum(d.Pack_StockTake_Qty ) as 'Pack_StockTake_Qty',
		sum(d.Pack_StockTake_Qty * d.Convertion) as 'subTotal',  d.PackUnit
		from StockTake_Details as d
		join StockTake as s on s.StockTake_ID = d.StockTake_ID
		where StockTake_Month = 6  and year((CAST(s.DateCreated AS date))) = 2024
		group by d.StockTake_ID, s.StockTake_Month, d.Material_ID,   d.PackUnit, year((CAST(s.DateCreated AS date)))
	) as a 
	group by a.Material_ID,   a.PackUnit
	) as b 
where b.subTotal > 0
; 



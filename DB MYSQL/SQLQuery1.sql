select b.* from (
select a.Material_ID, sum(a.TotalPack_Qty_InHand)  as 'beginningStock', a.BaseUnit, a.PackUnit
from 
(
	select d.Material_ID, d.StockTake_ID, s.StockTake_Month,
	sum(d.Pack_StockTake_Qty) as 'TotalPack_Qty_InHand', d.BaseUnit, d.PackUnit
	from StockTake_Details as d
	join StockTake as s on s.StockTake_ID = d.StockTake_ID
	where StockTake_Month = 8 
	group by d.StockTake_ID, s.StockTake_Month, d.Material_ID, d.BaseUnit, d.PackUnit
) as a

group by a.Material_ID, a.BaseUnit, a.PackUnit
) as b where b.beginningStock > 0;
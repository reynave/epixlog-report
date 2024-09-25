select  d.Material_ID, d.PackUnit,
sum(d.MaterialTotalAmount) as 'materialTotalAmount' , 'MR_GRN' as 'table'
from MR_GRN_Details as d
left join MR_GRN as m on m.Tranx_ID = d.Tranx_ID
where year((CAST(m.Received_Date AS date))) = 2024  and  month((CAST(m.Received_Date AS date))) = 1
group by d.Material_ID, d.PackUnit
 
 UNION ALL
 select  d.Material_ID, d.PackUnit,
sum(d.MaterialTotalAmount) as 'materialTotalAmount', 'DirectGRN' as 'table'
from DirectGRN_Details as d
left join DirectGRN as m on m.Tranx_ID = d.Tranx_ID
where year((CAST(m.Received_Date AS date))) = 2024  and  month((CAST(m.Received_Date AS date))) = 1
group by d.Material_ID, d.PackUnit;


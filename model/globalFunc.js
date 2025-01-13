// function mergeAndSumArrays(array1, array2) {
//     // Gabungkan kedua array
//     const combinedArray = [...array1, ...array2];

//     // Gunakan Map untuk menggabungkan dan menjumlahkan nilai berdasarkan key
//     const resultMap = new Map();

//     combinedArray.forEach(item => {
//         if (resultMap.has(item.key)) {
//             // Jika key sudah ada, tambahkan value-nya
//             resultMap.set(item.key, resultMap.get(item.key) + item.value);
//         } else {
//             // Jika key belum ada, tambahkan sebagai entry baru
//             resultMap.set(item.key, item.value);
//         }
//     });

//     // Ubah Map kembali menjadi array
//     return Array.from(resultMap, ([key, value]) => ({ key, value }));
// }

function mergeAndSumArrays(data) {
    const merged = data.reduce((acc, currentArray) => {
        currentArray.forEach(item => {
            const key = `${item.PackUnit}-${item.Material_ID}`;

            if (acc[key]) {
                // Jika sudah ada, tambahkan qty
                acc[key].qty += item.qty;
            } else {
                // Jika belum ada, tambahkan ke hasil
                acc[key] = { ...item };
            }
        });
        return acc;
    }, {});

    // Kembalikan hasil dalam bentuk array
    return Object.values(merged);
}

module.exports = { mergeAndSumArrays }; 
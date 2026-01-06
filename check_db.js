import { query } from './src/database/db.js';

async function checkData() {
    try {
        const locations = await query("SELECT * FROM locations WHERE pasillo IN ('A01', 'A02', 'A03') GROUP BY pasillo, rack LIMIT 10");
        console.log('Sample locations:', locations.map(l => ({
            pasillo: l.pasillo,
            rack: l.rack,
            x: l.x,
            y: l.y
        })));

        const columns = await query("PRAGMA table_info(locations)");
        console.log('Columns:', columns.map(c => c.name));
    } catch (error) {
        console.error(error);
    }
}

checkData();

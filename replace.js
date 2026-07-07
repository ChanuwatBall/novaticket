const fs = require('fs');
const path = 'd:/Projects/Other/nextticket/src/pages/Home.tsx';
let data = fs.readFileSync(path, 'utf8');
const target = 'const filtered =  provinces.filter(r=>{store.originProvinceId ? r.id != store.originProvinceId?.id : true})';
const replacement = 'const filtered =  provinces.filter(r=>{ return store.originProvinceId ? r.id != store.originProvinceId?.id : true})';
if (data.includes(target)) {
    data = data.replace(target, replacement);
    fs.writeFileSync(path, data, 'utf8');
    console.log('Replaced successfully!');
} else {
    console.log('Target string not found in file!');
}

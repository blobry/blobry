const items = apidata.data.filter(e => e.type.value === 'outfit' && e.series && e.series.image);
const Image = async (src) => new Promise((resolve) => loadImage(src).then(resolve));

let width = 512;
const canvas = new Canvas(2560, width * items.length);
const ctx = canvas.getContext('2d');
let x = 0;
let y = 0;
console.log(items)

for (const item of items) {
    ctx.drawImage(await Image(`https://blobry.herokuapp.com/images/cosmetics/br/${item.id}/icon.png?t=true`), x, y, 512, 512);
    const img = canvas.toDataURL();
    var data = img.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer.from(data, 'base64');
    fs.writeFile('image.png', buf, console.log);
    x += 512;
    if(x === 2560) {
        x = 0;
        y += 512
    }
    // y += 100000
    console.log(item)
}

const img = canvas.toDataURL();
var data = img.replace(/^data:image\/\w+;base64,/, "");
var buf = new Buffer.from(data, 'base64');
fs.writeFile('image.png', buf, console.log);

// const canvas = new Canvas(512, 512);
// const ctx = canvas.getContext('2d');
// ctx.drawImage(await Image('https://media.playstation.com/is/image/SCEA/ps4-systems-fortnite-bundle-banner-01-us-26jul19'), 0, 0, 512, 512);
// ctx.drawImage(await Image(item.images.icon), 0, 0, 512, 512);
// ctx.save();
// ctx.fillStyle = adadasd[item.rarity.displayValue].Color1;
// ctx.lineWidth = "5";
// ctx.rotate(3);
// ctx.globalAlpha = 0.8;
// ctx.fillRect(-448, -1000, 512, 512);

// ctx.restore();
// ctx.beginPath();

// ctx.shadowColor= adadasd[item.rarity.displayValue].Color2;
// ctx.shadowBlur=10;
// ctx.lineWidth=10;

// ctx.fillStyle = 'white';
// ctx.lineWidth = "5";
// ctx.font = "bold 65px fortnite";
// ctx.textAlign = "center";
// ctx.fillText("Renegade Raider", 512 / 2, 450, 512);

// ctx.font = '12 \'fortnite\'';
// ctx.fillText('adsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidhadsadnaudasidh', -120, -270);'


// const img = canvas.toDataURL();
// var data = img.replace(/^data:image\/\w+;base64,/, "");
// var buf = new Buffer.from(data, 'base64');
// fs.writeFile('image.png', buf, console.log);
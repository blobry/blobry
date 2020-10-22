import canvas from 'canvas';
import fetch from 'node-fetch';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieparser from 'cookie-parser';
import rarities from './src/json/rarities.json';
import denv from 'dotenv';
import fs from 'fs';

const { loadImage, registerFont, Canvas } = canvas;
const { client_id, client_secret, url } = process.env.PORT ? process.env : denv.config().parsed;

const Buffers = [];
const app = express();

registerFont('./src/fonts/index.ttf', {
    family: "text"
});

app.use('/static', express.static('root'));
app.set('trust proxy', 1);
app.use(cookieparser());
app.use(cors());
app.use(bodyParser.json());

class User {
    constructor(access_token) {
        this.token = access_token;
    }

    async repos() {
        return (await (await this.request('http://api.github.com/user/repos')).json()).filter(r => r.permissions.admin === true);
    }

    async request(url, token=this.token, method="GET") {
        return await fetch(url, {
            headers: {
                Authorization: `bearer ${token}`
            },
            method
        });
    }
}

const rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

(async () => {
    const Image = async (src) => new Promise((resolve) => loadImage(src).then(resolve));

    const settings = {
        cosmetics: {
            type: false,
            widgets: true,
            images: true
        }
    };
    
    const apidata = {
        a: "THIS IS JUST FORTNITE-API WITH EXTRA OBJECTS, I DID NOT MAKE THIS WHOLE API.",
        ...await (await fetch('https://fortnite-api.com/v2/cosmetics/br/')).json(),
        api: 'fortnite-api'
    };

    app.get('/static/og_image.png', (req, res) => {
        res.sendFile(Math.floor(Math.random() * 2) + 1 === 1 ? './root/web.png' : './root/computer.png');
    });

    app.get('/embed/og', (req, res) => {
        const author = req.query.author;
        res.send({
            type: "photo",
            author_name: author
        });
    });

    app.get('/embed.png', (req, res) => {
        const canvas = new Canvas(1, 1);
        const image = Buffer.from(canvas.toDataURL().split(",")[1], 'base64');

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': image.length
        });

        res.end(image);
    });

    app.get('/embed', (req, res) => {
        res.send(`<!DOCTYPE html><html prefix="og: http://ogp.me/ns#"><head>
            <title>${req.query.title}</title>
            <meta content="${req.query.title}" property="og:title"
            <meta content="${req.query.description}" property="og:description">
            <meta name="description" content="${req.query.description}">
            <meta property="og:type" content="website">
            <meta content="${req.query.image || "https://blobry.herokuapp.com/embed.png"}" property="og:image">
            <meta property="og:url" content="${req.query.url}">
            <meta name="theme-color" content="#${req.query.color}">
            <link type="application/json+oembed" href="https://blobry.herokuapp.com/embed/og?author=${req.query.author}">
            <meta charset="UTF-8">
          </head>
        </html>`);
    });

    app.get('/pages/auth', async (req, res) => {
        const code = req.query.code;
        const access_token = (await (await fetch(`${url}?${client_id}&${client_secret}&code=${code}`)).text()).split('&')[0].split('=')[1];
        if(access_token.length !== 40) return res.send(access_token);
        res.redirect('https://pages.blobry.com/dashboard');
    });

    app.listen(process.env.PORT || 100, () => console.log(`[Interact] Listening to http://localhost:${process.env.PORT || 100}/`));

    if(settings.cosmetics.type) for (const backendRaw of [...new Set(apidata.data.map(e => e.series ? e.series.backendValue : null))].filter(e => e)) {
        const invalidSeries = [{
            FrozenSeries: 'FrostSeries'
        }];
        const backendValue = invalidSeries.find(e => Object.keys(e)[0] === backendRaw) ? invalidSeries.find(e => Object.keys(e)[0] === backendRaw)[Object.keys(invalidSeries.find(e => Object.keys(e)[0] === backendRaw))[0]] : backendRaw;
        const {
            VectorParameterValues: values
        } = (await (await fetch(`https://benbotfn.tk/api/v1/assetProperties?path=FortniteGame/Content/Athena/UI/Frontend/CosmeticItemCard/Materials/M_UI_ItemCard_V2_${backendValue}.uasset`)).json()).export_properties[0];
        const VectorParameterValues = [];
        for (const { ParameterValue } of values) {
            const ValueRound = (e) => Math.round(e * 255);
            VectorParameterValues.push({
                R: ValueRound(ParameterValue.R),
                G: ValueRound(ParameterValue.G),
                B: ValueRound(ParameterValue.B),
                A: ValueRound(ParameterValue.A),
                Hex: rgbToHex(ValueRound(ParameterValue.R), ValueRound(ParameterValue.G), ValueRound(ParameterValue.B))
            });
        }
        for (const [index, value] of apidata.data.entries()) {
            if(value.series && value.series.backendValue === backendValue) {
                apidata.data[index].series.VectorParameterValues = VectorParameterValues;
            }
            if(value.series && invalidSeries.find(e => Object.keys(e)[0] === value.series.backendValue) && value.series.backendValue === backendRaw) {
                apidata.data[index].series.VectorParameterValues = VectorParameterValues;
            }
            if(settings.cosmetics.images) apidata.data[index].images.new = {
                small: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}.png`,
                icon: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}.png?size=medium`
            };
            if(settings.cosmetics.widgets) apidata.data[index].widget = {
                url: {
                    type: "background",
                    with: `https://blobry.herokuapp.com/widget?i=${value.id}`,
                    without: `https://blobry.herokuapp.com/widget?i=${value.id}?b=true`
                },
                html: {
                    type: "background",
                    with: `<iframe src="https://blobry.herokuapp.com/widget?i=${value.id}" width="140" height="140" frameborder="0"></iframe>`,
                    without: `<iframe src="https://blobry.herokuapp.com/widget?i=${value.id}" width="140" height="140" frameborder="0"></iframe>`
                }
            };
            const getImage = async (value, req, size) => {
                const sizes = {
                    small: {
                        width: 113,
                        height: 140,
                        x: -120,
                        y: -273,
                        p: -10
                    },
                    medium: {
                        width: 512,
                        height: 512,
                        x: -448,
                        y: -1000,
                        p: 0
                    }
                };
                size = sizes[size] || sizes.small;
                const p = req.query.p;
                const x = req.query.x;
                const y = req.query.y;
                const b = req.query.b === "true";
                const t = req.query.t === "true";
                const width = size.width;
                const height = size.height;
                const canvas = new Canvas(width, height);
                const ctx = canvas.getContext('2d');
                if(b === false) ctx.drawImage(await Image(value.series && value.series.image ? value.series.image : 'https://media.playstation.com/is/image/SCEA/ps4-systems-fortnite-bundle-banner-01-us-26jul19'), 0, 0, width, height);
                ctx.drawImage(await Image(value.images.icon), p || size.p, 0, height, height);
                const VectorParameterValues = value.series ? value.series.VectorParameterValues : null;
                ctx.save();
                if(!VectorParameterValues) ctx.fillStyle = rarities[value.rarity.displayValue].Color1;
                else {
                    ctx.fillStyle = VectorParameterValues[0].Hex;
                }
                ctx.lineWidth = "5";
                ctx.rotate(3);
                ctx.globalAlpha = 0.8;
                ctx.fillRect(x || size.x, y || size.y, height + 60, height);
                if(t) {
                    ctx.restore();
                    ctx.beginPath();
                    if(!VectorParameterValues) ctx.shadowColor = rarities[value.rarity.displayValue].Color1;
                    else {
                        ctx.shadowColor = VectorParameterValues[0].Hex;
                    }
                    ctx.shadowBlur = 1;
                    ctx.lineWidth = 10;
                    ctx.fillStyle = 'white';
                    ctx.lineWidth = "5";
                    ctx.font = "bold 65px text";
                    ctx.textAlign = "center";
                    ctx.fillText(value.name, 512 / 2, 450, 512);
                }
                return Buffer.from(canvas.toDataURL().split(",")[1], 'base64');
            }
            if(settings.cosmetics.images) app.get(`/images/cosmetics/br/${value.id}.png`, async (req, res) => {
                let ms = 0;
                let s = setInterval(() => ms += 1, 1);
                const b = req.query.b === "true";
                const size = req.query.size;
                if(!Buffers.find(e => e.id === value.id && e.size === size && e.b === b)) Buffers.push({
                    buffer: await getImage(value, req, size),
                    id: value.id,
                    size,
                    b
                });
                const image = Buffers.find(e => e.id === value.id && e.size === size && e.b === b).buffer;
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': image.length
                });

                res.end(image); 
                clearInterval(s);
                console.log(ms);
            });

            if(settings.cosmetics.widgets) app.get(`/widgets/cosmetics/br/${value.id}.widget`, async (req, res) => {
                const b = req.query.b === "true";
                const item = value;
                res.send(`<!DOCTYPE html><html><head><meta name="theme-color" content="${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity.displayValue].Color1}"><meta content="Blobry Fortnite-API Remake Icons" property="og:site_name"><meta property="og:url" content="${item.widget}"><meta property="og:type" content="website"><meta property="og:title" content="${item.name}"><meta property="og:description" content="${item.description}"><meta property="og:image" itemprop="image" content="${item.images.new.icon}?b=${b}"><meta property="twitter:url" content="${item.widget}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${item.name}"><meta name="twitter:description" content="${item.description}"><meta name="twitter:image" content="${item.images.new.icon}?b=${b}"><script src="https://code.jquery.com/jquery-3.5.1.js" integrity="sha256-QWo7LDvxbWT2tbbQ97B53yJnYU3WhH/C8ycbRAkjPDc=" crossorigin="anonymous"></script><script>$(document).ready(async () => {$('.item').children('div').hover((e) => {const target = e.currentTarget.parentElement;target.children[0].children[0].style.width = '155px';target.children[0].children[0].style.left = '-21px';target.children[1].style.top = '118px';}, (e) => {const target = e.currentTarget.parentElement;target.children[0].children[0].style.width = '';target.children[0].children[0].style.left = '';target.children[1].style.top = '';});});</script><style>.item {width: 113px;height: 140px;background-image: url(${b === false ? item.series && item.series.image ? item.series.image : 'https://media.playstation.com/is/image/SCEA/ps4-systems-fortnite-bundle-banner-01-us-26jul19' : ''});background-repeat: no-repeat;background-size: 113px 140px;overflow: hidden;transition: 0.2s;position: absolute;left: 0;top: 0;}.item > div:nth-of-type(1) {width: 113px;height: 140px;position: absolute;overflow: hidden;}.item img {width: 140px;position: absolute;left: -15px;transition: 0.2s;}.item > div:nth-of-type(2) {width: 100%;background: rgb(177, 177, 177);height: 100%;position: relative;top: 114px;transform: rotate(85deg);transition: 0.2s;opacity: 0.8;}</style></head><body><div class="item"><div><img src="${item.images.icon}"></div><div style="background: ${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity.displayValue].Color1};"></div></div></body></html>`);
            });
        }
    }

    app.get('/api/cosmetics', async (req, res) => {
        res.send(apidata);
    });

    app.get('/images/cosmetics/combine', async (req, res) => {
        const items = apidata.data;
        
        let width = 512;
        const canvas = new Canvas(2560, 10000);
        const ctx = canvas.getContext('2d');
        let x = 0;
        let y = 0;
        
        for (const item of items) {
            ctx.drawImage(await Image(`https://blobry.herokuapp.com/images/cosmetics/br/${item.id}.png?t=true&b=true&size=medium`), x, y, 512, 512);
            x += 512;

            const img = canvas.toDataURL();
            var data = img.replace(/^data:image\/\w+;base64,/, "");
            var buf = new Buffer.from(data, 'base64');
            fs.writeFile('image.png', buf, console.log);
            if(x === 2560) {
                x = 0;
                y += 512
            }
            // y += 100000
        }
        // const image = new Buffer.from(canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // res.writeHead(200, {
        //     'Content-Type': 'image/png',
        //     'Content-Length': image.length
        // });

        // res.end(image);
        
        // const img = canvas.toDataURL();
        // var data = img.replace(/^data:image\/\w+;base64,/, "");
        // var buf = new Buffer.from(data, 'base64');
        // fs.writeFile('image.png', buf, console.log);
    });
})();
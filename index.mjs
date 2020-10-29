import canvas from 'canvas';
import fetch from 'node-fetch';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieparser from 'cookie-parser';
import rarities from './src/json/rarities.json';
import denv from 'dotenv';
import fs from 'fs';
import uuid from 'uuid';
import crpot from 'crypto-js';
import cloudflare from 'cloudflare';
import badwords from 'badwords/array';
import jse from 'js-base64';
import octo from '@octokit/core';

const { Base64 } = jse;
const { Octokit } = octo;
const { AES, enc } = crpot;
const { loadImage, registerFont, Canvas } = canvas;
const { cloud, zone, message, token, key, temp } = process.env.PORT ? process.env : denv.config().parsed;

console.log(`[DEBUG] ${token}`);
console.log(`[DEBUG] Page for editing dns is at http${process.env.PORT ? 's' : ''}://${process.env.PORT ? `blobry.herokuapp.com` : 'localhost:100'}/${key}/pages/${token}/dns/${zone}/${key}/authorization/${key}/${zone}/${token}/${key}/add`);

const cf = cloudflare({
    token: cloud
});

const Buffers = [];
const app = express();

registerFont('./src/fonts/index.ttf', {
    family: "text"
});

app.use('/static', express.static('root'));
app.set('trust proxy', 1);
app.use(cookieparser());
app.use(cors({
    origin: /blobry\.com$/,
    credentials: true
}));
app.use(bodyParser.json());

const rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

class User {
    constructor(token) {
      this.token = token;
    }
  
    async get() {
      return await (await this.request('https://api.github.com/user')).json();
    }
  
    async repos() {
      return (await (await this.request('http://api.github.com/user/repos')).json()).filter(r => r.permissions.admin === true);
    }
  
    async request(url, method="GET") {
      return await fetch(url, {
        method,
        headers: {
          Authorization: `bearer ${this.token}`,
          "User-Agent": "Blobry API Pages"
        }
      });
    }
  }

(async () => {
    class DNS {
        constructor(dns, process) {
            this.dns = dns;
            this.process = process;
        }

        async add(page, user, name) {
            if(badwords.includes(page)) throw new Error("Page has a blacklisted word!");
            if(this.dns.find(e => e.name === `${page}.secure.blobry.com`)) throw new Error("Page already exists!");
            if(this.dns.filter(e => e.content === `${user}.github.io`).length > 5) throw new Error("You have over 5 pages!");
            if(!page) throw new Error("You have no page name!");
            if(!user) throw new Error("You have no user name!");
            const response = {
                ...await this.process.dnsRecords.add(zone, {
                    name: name || `${page}.secure.blobry.com`,
                    type: 'CNAME',
                    content: `${user}.github.io`
                }),
                pages: {
                    has: this.dns.filter(e => e.content === `${user}.github.io`).length - 1,
                    remaining: 5 - this.dns.filter(e => e.content === `${user}.github.io`).length + 1
                }
            };
            this.dns.push(response.result);
            return response;
        }

        get made() {
            return this.dns.filter(dns => dns.content.includes('.github.io'));
        }
    }

    class Cloud {
        constructor(process) {
            this.process = process;
            this.dns = null;
        }

        async setup() {
            this.dns = new DNS(await this.getDNS(), this.process);
        }

        async getDNS() {
            return (await this.process.dnsRecords.browse(zone)).result;
        }
    }

    const cloud = new Cloud(cf);
    await cloud.setup();

    app.post(`/pages/${temp}/validation/dns/add`, async (req, res) => {
        const request = {
            name: req.body.name,
            token: req.headers.authorization
        };
        let missing = '';
        for (const key of Object.keys(request)) {
            if(request[key] === undefined) missing += `${key}, `;
            if(typeof request[key] === 'object') {
                const o = request[key];
                for (const keye of Object.keys(o)) {
                    if(o[keye] === undefined || o[keye] === null) missing += `${key}.${keye}, `;
                }
            }
        }
        if(missing) res.send({
            error: `Missing (${missing.split(/\,(?=[^,]+$)/)[0]}) please add these params/headers.`,
            code: 1931
        });
        const octokit = new Octokit({ auth: request.token });
        try {
            await octokit.request("/user", {
                headers: {
                    "user-agent": "Blobry App"
                }
            });
        } catch(err) {
            return res.send({
                error: `The token you provided does not work, try to get a other token.`,
                code: 1341,
                response: err.message
            });
        }
        const { data: user } = await octokit.request("/user", {
            headers: {
                "user-agent": "Blobry App"
            }
        });
        const repos = (await octokit.request("/user/repos", {
            headers: {
                "user-agent": "Blobry App"
            }
        })).data.filter(r => r.permissions.admin === true);
        const repo = request.name ? repos.find(e => e.name === e) || (await octokit.request('POST /user/repos', {
            name: `${request.name}-blobry`,
            headers: {
                "user-agent": "Blobry App"
            },
            description: `A automated created page at ${!request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`}.`,
            homepage: !request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`
        })).data : repos.find(e => e.name === `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com`) || (await octokit.request('POST /user/repos', {
            name: `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com`,
            headers: {
                "user-agent": "Blobry App"
            },
            description: `A automated created page at ${!request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`}.`,
            homepage: !request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`
        })).data;
        await octokit.request(`PUT /${repo.contents_url.split('{+path}')[0].split('https://api.github.com/')[1]}index.html`, {
            path: 'index.html',
            message: 'Blobry Pages - Automation - index.html',
            content: Base64.encode(`<!DOCTYPE html>
 <html>
     <head>
        <title>${!request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}` : request.name}</title>
        <link rel="stylesheet" href="./index.css">
        <meta name="theme-color" content="#7289DA">
        <meta name="description" content="A page automade by pages.blobry.com.">
        <meta property="og:url" content="${!request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="Home Page">
        <meta property="og:description" content="A page made by pages.blobry.com.">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:title" content="Home Page">
        <meta name="twitter:description" content="A page made by pages.blobry.com.">
        <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
     </head>
     <body>
         Put a message here using the dashboard or in github.
         Good luck creating your first page!
     </body>
 </html>`)
        });
        await octokit.request(`PUT /${repo.contents_url.split('{+path}')[0].split('https://api.github.com/')[1]}index.css`, {
            path: 'index.css',
            message: 'Blobry Pages - Automation - index.css',
            content: Base64.encode(`/**
* We've created a little bit of css for you to build upon.
*/
html {
    background-color: #2c2f33;
    font-family: helvetica,arial,sans-serif;
    transition: .2s;
    color: white;
}`)
        });
        await octokit.request(`PUT /${repo.contents_url.split('{+path}')[0].split('https://api.github.com/')[1]}README.md`, {
            path: 'README.md',
            message: 'Blobry Pages - Automation - README.md',
            content: Base64.encode(`### Blobry\nA automated created page at ${!request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`}, create your own at [Blobry Pages](https://pages.blobry.com/)!`)
        });
        await octokit.request(`POST /repos/${repo.full_name}/pages`, {
            source: {
              branch: 'main',
              path: '/'
            },
            mediaType: {
              previews: [
                'switcheroo'
              ]
            },
            headers: {
                "accept": 'application/vnd.github.switcheroo-preview+json'
            }
        });
        await cloud.dns.add(request.name, user.login, !request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : null);
        await octokit.request(`PUT /repos/${repo.full_name}/pages`, {
            source: {
              branch: 'main',
              path: '/'
            },
            "cname": !request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : `${request.name}.secure.blobry.com`,
            headers: {
                "accept": 'application/vnd.github.switcheroo-preview+json',
                "user-agent": "Blobry App"
            }
        });
        res.send(repo);
    });

    const Image = async (src) => new Promise((resolve) => loadImage(src).then(resolve));
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
        // const VectorParameterValues = value.series ? value.series.VectorParameterValues : null;
        ctx.save();
        ctx.fillStyle = rarities[value.rarity.displayValue].Color1;
        // else {
        //     ctx.fillStyle = VectorParameterValues[0].Hex;
        // }
        ctx.lineWidth = "5";
        ctx.rotate(3);
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x || size.x, y || size.y, height + 60, height);
        if(t) {
            ctx.restore();
            ctx.beginPath();
            ctx.shadowColor = rarities[value.rarity.displayValue].Color1;
            // else {
            //     ctx.shadowColor = VectorParameterValues[0].Hex;
            // }
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

    const settings = {
        cosmetics: {
            type: true,
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

    app.listen(process.env.PORT || 100, () => console.log(`[Interact] Listening to http://localhost:${process.env.PORT || 100}/`));

    if(settings.cosmetics.type) for (const backendRaw of [...new Set(apidata.data.map(e => e.series ? e.series.backendValue : null))].filter(e => e)) {
        // const invalidSeries = [{
        //     FrozenSeries: 'FrostSeries'
        // }];
        // const backendValue = invalidSeries.find(e => Object.keys(e)[0] === backendRaw) ? invalidSeries.find(e => Object.keys(e)[0] === backendRaw)[Object.keys(invalidSeries.find(e => Object.keys(e)[0] === backendRaw))[0]] : backendRaw;
        // const {
        //     VectorParameterValues: values
        // } = (await (await fetch(`https://benbotfn.tk/api/v1/assetProperties?path=FortniteGame/Content/Athena/UI/Frontend/CosmeticItemCard/Materials/M_UI_ItemCard_V2_${backendValue}.uasset`)).json()).export_properties[0];
        // const VectorParameterValues = [];
        // for (const { ParameterValue } of values) {
        //     const ValueRound = (e) => Math.round(e * 255);
        //     VectorParameterValues.push({
        //         R: ValueRound(ParameterValue.R),
        //         G: ValueRound(ParameterValue.G),
        //         B: ValueRound(ParameterValue.B),
        //         A: ValueRound(ParameterValue.A),
        //         Hex: rgbToHex(ValueRound(ParameterValue.R), ValueRound(ParameterValue.G), ValueRound(ParameterValue.B))
        //     });
        // }
        for (const [index, value] of apidata.data.entries()) {
            // if(value.series && value.series.backendValue === backendValue) {
            //     apidata.data[index].series.VectorParameterValues = VectorParameterValues;
            // }
            // if(value.series && invalidSeries.find(e => Object.keys(e)[0] === value.series.backendValue) && value.series.backendValue === backendRaw) {
            //     apidata.data[index].series.VectorParameterValues = VectorParameterValues;
            // }
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
                    with: `<iframe src="https://api.blobry.com/widgets/cosmetics/br/CID_030_Athena_Commando_M_Halloween?b=true" width="140" height="140" frameborder="0"></iframe>`,
                    without: `<iframe src="https://blobry.herokuapp.com/widget?i=${value.id}" width="140" height="140" frameborder="0"></iframe>`
                }
            };
            // if(settings.cosmetics.images)

            // if(settings.cosmetics.widgets) app.get(`/widgets/cosmetics/br/${value.id}.widget`, async (req, res) => {
            //     const b = req.query.b === "true";
            //     const item = value;
            // });
        }
    }

    app.get('/api/cosmetics', async (req, res) => {
        res.send(apidata);
    });

    app.get(`/images/cosmetics/br/:id/medium.png`, async (req, res) => {
        const id = req.params.id;
        const value = apidata.data.find(e => e.id === id);
        if(!value) return res.status(404).send('404 - Item not found.');
        let ms = 0;
        let s = setInterval(() => ms += 1, 1);
        const b = req.query.b === "true";
        const t = false;
        const size = null;
        if(!Buffers.find(e => e.id === value.id && e.size === size && e.b === b && e.t === t)) Buffers.push({
            buffer: await getImage(value, req, size),
            id: value.id,
            size,
            b,
            t
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

    app.get(`/widgets/cosmetics/br/:id`, async (req, res) => {
        const id = req.params.id;
        const item = apidata.data.find(e => e.id === id);
        if(!item) return res.status(404).send('404 - Item not found.');
        const b = req.query.b === "true";
        res.send(`<!DOCTYPE html><html><head><meta name="theme-color" content="${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity.displayValue].Color1}"><meta content="Blobry Fortnite-API Remake Icons" property="og:site_name"><meta property="og:url" content="${item.widget}"><meta property="og:type" content="website"><meta property="og:title" content="${item.name}"><meta property="og:description" content="${item.description}"><meta property="og:image" itemprop="image" content="${item.images.new.icon}?b=${b}"><meta property="twitter:url" content="${item.widget}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${item.name}"><meta name="twitter:description" content="${item.description}"><meta name="twitter:image" content="${item.images.new.icon}?b=${b}"><script src="https://code.jquery.com/jquery-3.5.1.js" integrity="sha256-QWo7LDvxbWT2tbbQ97B53yJnYU3WhH/C8ycbRAkjPDc=" crossorigin="anonymous"></script><script>$(document).ready(async () => {$('.item').children('div').hover((e) => {const target = e.currentTarget.parentElement;target.children[0].children[0].style.width = '154px';target.children[0].children[0].style.left = '0px';target.children[1].style.top = '94%';}, (e) => {const target = e.currentTarget.parentElement;target.children[0].children[0].style.width = '';target.children[0].children[0].style.left = '';target.children[1].style.top = '';});});</script><style>.item {width: 140px;height: 140px;background-image: url(${b === false ? item.series && item.series.image ? item.series.image : 'https://media.playstation.com/is/image/SCEA/ps4-systems-fortnite-bundle-banner-01-us-26jul19' : ''});background-repeat: no-repeat;background-size: 113px 140px;overflow: hidden;transition: 0.2s;position: absolute;left: 0;top: 0;}.item > div:nth-of-type(1) {width: 375px;height: 140px;position: absolute;}.item img {width: 140px;position: absolute;transition: 0.2s;}.item > div:nth-of-type(2) {width: 100%;background: rgb(177, 177, 177);height: 100%;position: relative;top: 91%;left:4%;transform: rotate(85deg);transition: 0.2s;opacity: 0.8;}</style></head><body><div class="item"><div><img src="${item.images.icon}"></div><div style="background: ${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity.displayValue].Color1};"></div></div></body></html>`);
    });

    app.get(`/images/cosmetics/br/:id/large.png`, async (req, res) => {
        const id = req.params.id;
        const value = apidata.data.find(e => e.id === id);
        if(!value) return res.status(404).send('404 - Item not found.');
        let ms = 0;
        let s = setInterval(() => ms += 1, 1);
        const b = req.query.b === "true";
        const t = req.query.t === "true";
        const size = 'medium';
        if(!Buffers.find(e => e.id === value.id && e.size === size && e.b === b && e.t === t)) Buffers.push({
            buffer: await getImage(value, req, size),
            id: value.id,
            size,
            b,
            t
        });
        const image = Buffers.find(e => e.id === value.id && e.size === size && e.b === b && e.t === t).buffer;
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': image.length
        });

        res.end(image); 
        clearInterval(s);
        console.log(ms);
    });

    app.get(`/images/cosmetics/br/:id`, async (req, res) => {
        const id = req.params.id;
        const value = apidata.data.find(e => e.id === id);
        if(!value) return res.status(404).send('404 - Item not found.');
        res.send({
            large: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}/large.png`,
            medium: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}/medium.png`   
        });
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
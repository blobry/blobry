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
import mongodb from 'mongodb';
import word from 'number-words';
import hexyjs from 'hexyjs';
import badWords from 'bad-words';

const { v4 } = uuid;

const { Base64 } = jse;
const { Octokit } = octo;
const { MongoClient, ObjectId } = mongodb;
const { loadImage, registerFont, Canvas } = canvas;
let { cloud, zone, name, username, password } = process.env.PORT ? process.env : denv.config().parsed;
let temp = uuid.v4().replace(/-/g, '');
const { AES, enc } = crpot;
const accountsSessions = {};
const statusCodetoObject = {
    401: {
        error: 'fort.errors.auth.required',
        message: 'Please authorize to use this endpoint.'
    },
    529: {
        error: 'fort.accounts.full',
        message: 'Please try again later.'
    },
    404: {
        error: 'fort.action.notFound',
        message: 'The action or thing is not found.'
    },
    400: {
        error: 'fort.request.parameters',
        message: 'You need to send the requested parameters!'
    }
}
  
function throwError(res, statusCode, customMessage) {
  return res.status(statusCode).send({
    ...statusCodetoObject[statusCode],
    statusCode,
    ...customMessage ? {
      message: customMessage
    } : {}
  });
}

async function getUser(token, ip, encrpt) {
  const user = await (await fetch('https://discordapp.com/api/v6/users/@me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${!encrpt ? AES.decrypt(token, ip).toString(enc.Utf8) : token}`
    }
  })).json();
  return user;
}

setInterval(() => {
  temp = uuid.v4().replace(/-/g, '');
  console.log(`[DEBUG] http${process.env.PORT ? 's' : ''}://${process.env.PORT ? `blobry.herokuapp.com` : 'localhost:100'}/pages/${temp}/`);
}, 1000 * 150);

console.log(`[DEBUG] http${process.env.PORT ? 's' : ''}://${process.env.PORT ? `blobry.herokuapp.com` : 'localhost:100'}/pages/${temp}/`);

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
    origin: /$/, // /blobry\.com$/
    credentials: true
}));
app.use(bodyParser.json({
  limit: '1000mb'
}));

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
    const client = new MongoClient(`mongodb+srv://${username}:${password}@${name.toLowerCase()}.r2rf9.mongodb.net/${name}?retryWrites=true&w=majority`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await client.connect();
    const collections = {
        authorized: {
            data: (await (client.db('Fort').collection('Users')).findOne({ "_id": new ObjectId('5fa0b33e67807ffd014edd59')})).data,
            collection: client.db('Fort').collection('Users')
        },
        repls: {
          data: (await (client.db('Fort').collection('Repl.it')).findOne({ "_id": new ObjectId('5fa0b61bf083fc52bb69202f')})).data,
          collection: client.db('Fort').collection('Repl.it')
        }
    }

    class Actor {
      constructor(ip, writer, type, textured, id, name) {
        this.ip = ip;
        this.writer = writer;
        this.type = type;
        this.textured = textured;
        this.id = id;
        this.name = name;
      }
    }

    class Session {
      constructor() {
        this.rawActors = [];
        this.listeners = [];
        this.writers = [];
      }
  
      addActor(actor) {
        this.rawActors.push(actor);
        this.sendToAll(this.listeners);
      }

      sendToAll(listeners) {
        let length = listeners.length;

        while(length--) {
          const listener = listeners[length];

          listener.res.write(`data: ${JSON.stringify(this.actors)}\n\n`);
        }
      }
      
      get actors() {
        const actors = [];
        let length = this.rawActors.length;
  
        while(length--) {
          const actor = this.rawActors[length];
  
          actors.push({
            type: actor.type,
            textured: actor.textured,
            id: actor.id,
            name: actor.name
          });
        }
  
        return actors;
      }
    }

    const session = new Session();
    const characters = [
      'Ramirez',
      'Wild Streak',
      'Jonesy'
    ];

    class Confusables {
      constructor(confusables, custom) {
          this.confusables = {};
          if(custom) confusables += `\n${custom}`;
          for (const confusable of confusables.matchAll(/\( . → . \)/ug)) {
              const conversion = confusable[0].replace(/\( /g, '').replace(/ \)/g, '').trim().split(' → ');
              const unciode = conversion[0];
              const original = conversion[1];
              this.confusables[unciode] = original;
          }
          this.keys = Object.keys(this.confusables);
      }
    
      replace(content) {
          const keys = this.keys;
          const found = [];
          for (const key of keys) {
              if(key === '|') continue;
              const regex = new RegExp(key, 'g');
              const value = this.confusables[key];
              if(content !== content.replace(regex, value)) {
                  content = content.replace(regex, value);
                  found.push({
                      [key]: value
                  });
              }
          }
          return {
              found,
              content
          };
      }
    }

    const confusables = new Confusables(await (await fetch('http://www.unicode.org/Public/security/latest/confusables.txt')).text());

    app.post('/api/interactive', async (req, res) => {
      const ip = req.ip;

      const character = req.query.type;
      const textured = req.query.textured;
      const name = req.query.name;

      if(!character || !textured || !name) return res.send('You are missing the type/textured/name body property.').status(403);
      if(!characters.includes(character)) return res.send('That character doesn\'t exist!').status(403);

      if(session.rawActors.find(e => e.ip === ip)) {
        session.rawActors.find(e => e.ip === ip).type = character;
        session.rawActors.find(e => e.ip === ip).textured = textured;
        session.sendToAll(session.listeners);
        res.send('Set new data.');
        return;
      }

      if(session.actors.length > 5) return res.send('Max users reached!').status(403);

      const actor = new Actor(ip, null, character, textured, v4(), new badWords().clean(confusables.replace(name).content));
      session.addActor(actor);

      res.sendStatus(204);
    });

    app.get('/api/interactive', async (req, res) => {
      const ip = req.ip;

      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.flushHeaders();

      res.once('close', async () => {
        session.listeners = session.listeners.filter((r) => r.ip !== ip);
        if(session.rawActors.find(e => e.ip === ip)) {
          session.rawActors = session.rawActors.filter(e => e.ip !== ip);
          session.sendToAll(session.listeners);
        }
        return res.end();
      });

      res.write(`data: ${JSON.stringify(session.actors)}\n\n`);
      session.listeners.push({
        res,
        ip
      });
      // setInterval(() => {
      //   res.write(`data: ${JSON.stringify(session.actors)}\n\n`);
      // }, 500);
    });

    app.post('/api/repl/account', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const repl = req.body.repl;
        const cid = req.body.cid;
        const name = req.body.name;
        const old = req.body.old;
        const operation = req.body.operation;
        if(!operation) return throwError(res, 403, 'Operation is needed.');
        switch(operation) {
          case 'create': {
            if(!repl || !name || !cid) return throwError(res, 403, 'Parms are missing and is needed.');
            if(!repl.endsWith('repl.co')) return throwError(res, 403, 'Repl.it link is invalid.');
            try {
              await fetch(repl);
            } catch(err) {
              return throwError(res, 403, 'Repl.it link doesn\'t exist.');
            }
            if(collections.repls.data.filter(e => e.user === user.id)[5]) return throwError(res, 403, 'You can only have five custom on each account.');
            if(collections.repls.data.find(e => e.name === name)) return throwError(res, 403, 'A bot with that name exists!');
            if(collections.repls.data.find(e => e.repl === repl)) return throwError(res, 403, 'A bot with that repl.it link exists!');
            collections.repls.collection.findOneAndUpdate({
              _id: new ObjectId('5fa0b61bf083fc52bb69202f'),
            }, {
              $push: {
                data: {
                  repl,
                  user: user.id,
                  name,
                  cid
                }
              }
            });
            collections.repls.data.push({
              repl,
              user: user.id,
              name,
              cid
            });
            res.sendStatus(204);
          } break;
    
          case 'edit': {
            if(!repl || !name || !cid || !old || !old.name) return throwError(res, 403, 'Parameters are missing and is needed.');
            const collection = collections.repls.data.find(e => e.name === old.name && e.repl === repl);
            if(!collection) return throwError(res, 403, 'Bot doesn\' exist!');
            collections.repls.collection.findOneAndUpdate({
              _id: new ObjectId('5fa0b61bf083fc52bb69202f'),
              "data.name": old.name,
              "data.repl": repl,
              "data.user": user.id
            }, {
              $set: {
                "data.$.name": name,
                "data.$.cid": cid
              }
            });
            collection.name = name;
            collection.cid = cid;
            res.sendStatus(204);
          } break;
    
          case 'delete': {
            if(!repl) return throwError(res, 403, 'Parameters are missing and is needed.');
            const collection = collections.repls.data.find(e => e.repl === repl);
            if(!collection) return throwError(res, 403, 'Bot doesn\' exist!');
            collections.repls.collection.findOneAndUpdate({
              _id: new ObjectId("5fa0b61bf083fc52bb69202f")
            }, {
              $pull: {
                data: collection
              } 
            }, false, true);
            collections.repls.data = collections.repls.data.filter(e => e.repl !== repl);
            res.sendStatus(204);
          } break;
    
          default: {
            throwError(res, 403, 'Operation is invalid.');
          } break;
        }
      });
    
      app.get('/api/accounts', async (req, res) => {
          console.log(req.headers.cookie)
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        return res.send(collections.repls.data.filter(e => e.user === user.id));
        // const AuthorizeMethods = getNonUsedAuths();
        // const response = {
        //   auth: AuthorizeMethods.length !== 0,
        //   accounts: []
        // }
        // if(collections.repls.data.find(e => e.user === user.id)) response.accounts.push(collections.repls.data.find(e => e.user === user.id));
        // if(AuthorizeMethods.length !== 0) {
        //   for (const account of AuthorizeMethods) {
        //     response.accounts.push({
        //       name: account.displayName
        //     });
        //   }
        // }
        res.send(response);
      });
    
      app.get('/api/auth/', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        res.send({ auth: req.query.auth });
      });
    
      app.delete('/api/account/party/member', async (req, res) => {
        if(!req.query.id) return throwError(res, 400);
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const id = req.body.id;
        const session = sessions.find(session => session.user === user.id);
        if(!session) return throwError(res, 401, 'Session not found.');
        const client = session.client;
        const member = client.party.members.find(m => m.id === id);
        if(!member) return throwError(res, 404, 'Member not found.');
        await member.kick();
        res.sendStatus(200);
      });
    
      app.post('/api/account/friends/send', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const session = sessions.find(session => session.user === user.id);
        const friend = req.query.id;
        const message = req.query.message;
        if(!friend || !message) return throwError(res, 400);
        if(!session || !session.client) return throwError(res, 401);
        const client = session.client;
        client.sendFriendMessage(friend, message);
        res.sendStatus(204);
      });
    
      app.post('/api/account/party/send', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const session = sessions.find(session => session.user === user.id);
        const message = req.query.message;
        if(!message) return throwError(res, 400);
        if(!session || !session.client) return throwError(res, 401);
        const client = session.client;
        client.party.sendMessage(message);
        res.sendStatus(204);
      });
    
      app.post('/api/account/friends/remove', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const session = sessions.find(session => session.user === user.id);
        const friend = req.query.id;
        if(!friend) return throwError(res, 400);
        if(!session || !session.client) return throwError(res, 401);
        const client = session.client;
        await client.removeFriend(friend);
        res.sendStatus(204);
      });
    
      app.post('/api/account/friends/invite', async (req, res) => {
        if(!accountsSessions[req.query.auth]) return throwError(res, 401);
        const user = accountsSessions[req.query.auth].user;
        const session = sessions.find(session => session.user === user.id);
        const friend = req.query.id;
        if(!friend)  return throwError(res, 400);
        if(!session || !session.client) return throwError(res, 401);
        const client = session.client;
        await client.invite(friend);
        res.sendStatus(204);
      });
    
      app.get('/api/user', async (req, res) => {
        const auth = req.query.auth;
        if(!accountsSessions[auth]) return res.send({ authorization: false });
        res.send({...accountsSessions[auth].user});
      });
    
      app.get('/api/authorize', async (req, res) => {
        const code = new URL(`http://localhost:5000${req.originalUrl}`).searchParams.get('code');
        if(!code) return res.sendStatus(404);
        if(accountsSessions[req.query.auth]) return res.redirect('http://fort.blobry.com/');
        const auth = await (await fetch('https://discordapp.com/api/oauth2/token', {
          method: 'POST',
          body: `client_id=763165673161490442&client_secret=65cIP2S33L-NhqtI4NhySGZsFUoCeLGp&grant_type=authorization_code&redirect_uri=https://api.blobry.com/authorize&code=${code}&scope=identify`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        })).json();
        if(auth.error) return res.send(auth);
        const token = uuid.v4();
        accountsSessions[token] = {
          user: await getUser(auth.access_token, null, true)
        };
        res.cookie('auth', token, {
          maxAge: 253402300799999,
          httpOnly: false,
          sameSite: 'none',
          secure: true
        });
        collections.authorized.collection.findOneAndUpdate({
          "_id": new ObjectId('5fa0b33e67807ffd014edd59'),
        }, {$push: {data: token}});
        res.send({token});
      });

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

    app.get(`/pages`, async (req, res) => {
        const request = {
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
        })).data.filter(r => {
            const name = r.name;
            const cloudflare = name.includes('.secure') || name.includes('-blobry') ? cloud.dns.dns.find(e => e.name === name.includes('-blobry') ? `${name.split('-blobry')[0]}.secure.blobry.com` : name) : null;
            return r.permissions.admin === true && cloudflare;
        });
        res.send({
            ...user,
            pages: repos
        })
    });

    app.post(`/pages/:temp`, async (req, res) => {
        if(req.params.temp !== temp) return res.status(404).send(`Cannot POST /pages/${req.params.temp}`);
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
        await cloud.dns.add(request.name || 'test', user.login, !request.name ? `${user.login}.${cloud.dns.dns.filter(e => e.content === `${user.login}.github.io`).length - 1 || 5}.secure.blobry.com` : null);
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
    
    // const apidata = {
    //     a: "THIS IS JUST FORTNITE-API WITH EXTRA OBJECTS, I DID NOT MAKE THIS WHOLE API.",
    //     ...await (await fetch('https://fortniteapi.io/v1/items/list?lang=en', {headers: {"Authorization": "ae94e26e-c67dfdd2-fb878cc3-d1411139"}})).json(),
    //     rarities: await (await fetch('https://fortniteapi.io/v1/rarities', {headers: {"Authorization": "ae94e26e-c67dfdd2-fb878cc3-d1411139"}})).json(),
    //     api: 'fortniteapi',
    //     array: []
    // };

    // const keys = Object.keys(apidata.items);
    // let length = keys.length;

    // while (length--) {
    //   const key = keys[length];
    //   const items = apidata.items[key];
    //   let ilength = items.length;
    //   while (ilength--) {
    //     const item = items[ilength];
    //     apidata.array.push(item);
    //   }
    // }

    // apidata.array = apidata.items.outfit;
    // console.log(apidata.array)

    // const CID = "CID_{number}_Athena_Commando_M_HightowerVertigo";
    // let length = 860;

    // setInterval(() => {
    //   length++;
    //   console.log(`length - ${length} - trying`)
    //   system.changeCosmeticItem('outfit', CID.replace('{number}', length));
    // }, 1000);

    // console.log(apidata.items.outfit)

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
    app.post('/api/do/the/thingy/boom', (req, res) => {
      const find = (array, values=[]) => {
        let length = array.length;
        while (length--) {
          const value = array[length];
          if(Array.isArray(value)) {
            values.push(find(value, values));
          }
          else {
            values.push(value);
          }
        }
        return values.filter(e => !Array.isArray(e)).filter(e => e !== "" && e !== null && e !== "null" && e !== ",")
      }
      const string = find(JSON.parse(hexyjs.hexToStr(hexyjs.hexToStr(req.body.data).replace(/\[/g, '').replace(/\]/g, '').replace(/"/g, '')))[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0]);
      res.send(string);
    });


    app.get('/api/do/the/thingy/boom/boom', (req, res) => {
      const string = req.query.data;

      let codes = [];

      let { length } = string;
      while (length--) {
          const chars = JSON.stringify([[[[[[[[[[[[[[[[[[[[[[JSON.stringify([...String(string[length].split('').map(a => {
            if(a === '') return;
            return hexyjs.strToHex(JSON.stringify([[[[[[[[JSON.stringify([[[[String(a.charCodeAt(0))]]]])]]]]]]]]));
          })[0]).split("").map(e => [[[[[[Number(e)]]]]]])])].map(e => e.split('[')).map(e => e.map(e => [[[[e.split(']')]]]]).map(e => [[[[[[e]]]]]]))]]]]]]]]]]]]]]]]]]]]]);
          codes.push(hexyjs.strToHex(JSON.stringify([[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[chars]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]])));
          // codes.push([]);
          // while (charlength--) {
          //     codes[codes.length - 1].push([Number(chars[charlength])]);
          // }
          // codes[codes.length - 1] = codes[codes.length - 1];
          // codes = codes;
      };
      res.send(codes);
    })

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

    // if(settings.cosmetics.type) for (const backendRaw of [...new Set(apidata.array.map(e => e.series ? e.series.backendValue : null))].filter(e => e)) {
    //     // const invalidSeries = [{
    //     //     FrozenSeries: 'FrostSeries'
    //     // }];
    //     // const backendValue = invalidSeries.find(e => Object.keys(e)[0] === backendRaw) ? invalidSeries.find(e => Object.keys(e)[0] === backendRaw)[Object.keys(invalidSeries.find(e => Object.keys(e)[0] === backendRaw))[0]] : backendRaw;
    //     // const {
    //     //     VectorParameterValues: values
    //     // } = (await (await fetch(`https://benbotfn.tk/api/v1/assetProperties?path=FortniteGame/Content/Athena/UI/Frontend/CosmeticItemCard/Materials/M_UI_ItemCard_V2_${backendValue}.uasset`)).json()).export_properties[0];
    //     // const VectorParameterValues = [];
    //     // for (const { ParameterValue } of values) {
    //     //     const ValueRound = (e) => Math.round(e * 255);
    //     //     VectorParameterValues.push({
    //     //         R: ValueRound(ParameterValue.R),
    //     //         G: ValueRound(ParameterValue.G),
    //     //         B: ValueRound(ParameterValue.B),
    //     //         A: ValueRound(ParameterValue.A),
    //     //         Hex: rgbToHex(ValueRound(ParameterValue.R), ValueRound(ParameterValue.G), ValueRound(ParameterValue.B))
    //     //     });
    //     // }
    //     for (const [index, value] of apidata.array.entries()) {
    //         // if(value.series && value.series.backendValue === backendValue) {
    //         //     apidata.array[index].series.VectorParameterValues = VectorParameterValues;
    //         // }
    //         // if(value.series && invalidSeries.find(e => Object.keys(e)[0] === value.series.backendValue) && value.series.backendValue === backendRaw) {
    //         //     apidata.array[index].series.VectorParameterValues = VectorParameterValues;
    //         // }
    //         if(settings.cosmetics.images) apidata.array[index].images.new = {
    //             small: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}.png`,
    //             icon: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}.png?size=medium`
    //         };
    //         if(settings.cosmetics.widgets) apidata.array[index].widget = {
    //             url: {
    //                 type: "background",
    //                 with: `https://blobry.herokuapp.com/widget?i=${value.id}`,
    //                 without: `https://blobry.herokuapp.com/widget?i=${value.id}?b=true`
    //             },
    //             html: {
    //                 type: "background",
    //                 with: `<iframe src="https://api.blobry.com/widgets/cosmetics/br/CID_030_Athena_Commando_M_Halloween?b=true" width="140" height="140" frameborder="0"></iframe>`,
    //                 without: `<iframe src="http://127.0.0.1:8787/v1/widget/CID_784_Athena_Commando_F_RenegadeRaiderFire/" width="140" height="140" frameborder="0"></iframe>`
    //             }
    //         };
    //         // if(settings.cosmetics.images)

    //         // if(settings.cosmetics.widgets) app.get(`/widgets/cosmetics/br/${value.id}.widget`, async (req, res) => {
    //         //     const b = req.query.b === "true";
    //         //     const item = value;
    //         // });
    //     }
    // }

    app.get('/api/cosmetics', async (req, res) => {
        res.send(apidata);
    });

    app.get(`/images/cosmetics/br/:id/medium.png`, async (req, res) => {
        const id = req.params.id;
        const value = apidata.array.find(e => e.id === id);
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
    });

    app.get(`/widgets/cosmetics/br/:id`, async (req, res) => {
        const id = req.params.id;
        const item = apidata.array.find(e => e.id === id);
        if(!item) return res.status(404).send('404 - Item not found.');
        const b = req.query.b === "true";
        const bc = req.query.bc === "true";
        res.send(`<!DOCTYPE html><html><head><meta name="theme-color" content="${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity].Color1}"><meta content="docs.blobry.com" property="og:site_name"><meta property="og:url" content="${item.widget}"><meta property="og:type" content="website"><meta property="og:title" content="${item.name}"><meta property="og:description" content="${item.description}"><meta property="og:image" itemprop="image" content="${item.images.icon}?b=${b}"><meta property="twitter:url" content="${item.widget}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${item.name}"><meta name="twitter:description" content="${item.description}"><meta name="twitter:image" content="${item.images.icon}?b=${b}"><script src="https://code.jquery.com/jquery-3.5.1.js" integrity="sha256-QWo7LDvxbWT2tbbQ97B53yJnYU3WhH/C8ycbRAkjPDc=" crossorigin="anonymous"></script><style>
        .item{width:250px;height:250px;background-image:url(${b === false ? item.series && item.series.image ? item.series.image : 'https://media.playstation.com/is/image/SCEA/ps4-systems-fortnite-bundle-banner-01-us-26jul19' : ''});background-repeat:no-repeat;background-size:100vh 100vh;overflow:hidden;transition:0.2s;position:absolute;left:0;top:0}.item>div:nth-of-type(1){width:375px;height:140px;position:absolute}.item img{width:250px;position:absolute;transition:0.2s}.item>div:nth-of-type(2){background:rgb(177,177,177);transform:rotate(-4deg);top:234px;height:25px;width:251px;transition:0.2s;position:relative;opacity:.8}.item:hover>div:nth-of-type(2):hover{top:233px}.item:hover img{transform:scale(1.1)}.item>div:nth-of-type(3){background:#b1b1b1;transform:rotate(-4deg);top:205px;height:5px;width:251px;transition:.2s;filter:brightness(1.1);position:relative}</style></head><body>
        <div class="item" ${b === false && bc ? `style="background: ${rarities[item.rarity].Color1};
        background: -moz-linear-gradient(169deg, ${rarities[item.rarity].Color1} 0%, ${rarities[item.rarity].Color2} 100%);
        background: -webkit-linear-gradient(169deg, ${rarities[item.rarity].Color1} 0%, ${rarities[item.rarity].Color2} 100%);
        background: linear-gradient(169deg, ${rarities[item.rarity].Color1} 0%, ${rarities[item.rarity].Color2} 100%);
        filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#378ad0",endColorstr="#182782",GradientType=1);"` : ""}><div><img src="${item.images.icon}"></div><div style="background: ${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity].Color1};"></div><div style="background: ${item.series && item.series.VectorParameterValues ? item.series.VectorParameterValues[0].Hex : rarities[item.rarity].Color1};"></div></div></body></html>`);
    });

    app.get(`/w/:id`, async (req, res) => {
      const id = req.params.id;
      const item = apidata.array.find(e => e.id === id);
      const t = req.query.t;
      const a = req.query.a;
      const b = req.query.b;
      if(!item) return res.status(404).send('404 - Item not found.');
      const canvas = new Canvas(524, 820);
      const ctx = canvas.getContext('2d');
      const rarity = apidata.rarities.rarities.find(e => e.name === item.rarity) || item;
      const gradient = ctx.createLinearGradient(0, 0, 0, 0);
      gradient.addColorStop(0, rarity.colorA);
      gradient.addColorStop(0, rarity.colorB);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 524, 820);
      ctx.drawImage(await Image(item.images.featured || item.images.icon), -75, 0, 680, 820);
      ctx.save();
      ctx.fillStyle = rarity.colorA;
      ctx.translate(524/2, 820/2);
      ctx.rotate(37.66);
      ctx.fillRect(-272, 270, 524, 30);
      ctx.restore();
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 700, 524, 820);
      ctx.fillStyle = '#0f0d12';
      ctx.fillRect(0, 750, 524, 820);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `normal 50px text`;
      ctx.textAlign = 'center';
      ctx.fillText(item.name, canvas.width / 2, 742);

      const buffer = Buffer.from(canvas.toDataURL().split(",")[1], 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });

      res.end(buffer);
    });

    app.get(`/images/cosmetics/br/:id/large.png`, async (req, res) => {
        const id = req.params.id;
        const value = apidata.array.find(e => e.id === id);
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
        const value = apidata.array.find(e => e.id === id);
        if(!value) return res.status(404).send('404 - Item not found.');
        res.send({
            large: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}/large.png`,
            medium: `https://blobry.herokuapp.com/images/cosmetics/br/${value.id}/medium.png`   
        });
    });

    app.get('/images/cosmetics/combine', async (req, res) => {
        const items = apidata.array;
        
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

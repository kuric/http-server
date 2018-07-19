const http = require('http');
const mime = require('mime');
const path = require('path');
const url = require('url');
const fs = require('fs');
const config = require('./config/config');

module.exports = http.createServer((req, res) =>{
    let pathName = decodeURI(url.parse(req.url).pathname);
    let fileName = pathName.slice(1);

    if(fileName.includes('/') || fileName.includes('..')) {
        res.statusCode = 400;
        res.end('Bad request');
        return;
    }

    switch(req.method) {
        case 'GET': {
            if(pathName === '/') {
                sendFile(config.publicPath + '/index.html', res);
            } else {
                let filePath = path.join(config.filesPath + fileName);
                sendFile(filePath, res);
            }
        }
        break;
        case 'POST': {
            if(!fileName) {
                res.statusCode = 404;
                res.end('Nothing found');
            }
            let filePath = path.join(config.filesPath + fileName);
            receiveFile(filePath, req, res);
        }
        break;
        case 'DELETE': {
            if(pathName === '/' || !fileName) {
                res.statusCode = 400;
                res.end('Bad request');
                return;
            } else {
                let filePath = path.join(config.filesPath + fileName);
                deleteFile(filePath, req);
            }
        }
        break;
        default: {
            res.statusCode = 400;
            res.end('Bad request');
        }
        break;
    }
    function sendFile(fileName, res) {
        let file = fs.createReadStream(fileName);
        file.pipe(res);

        file
            .on('error', (err) => {
                if(err.code === 'ENOENT') {
                    res.statusCode = 404;
                    res.end('File not found');
                } else{
                    if(!res.headersSend) {
                        res.statusCode = 500;
                        res.end('Server error');
                    } else {
                        res.end();
                    }
                }
            })
            .on('open', data => {
                res.setHeader('Content-Type', mime.getType(fileName));
            });

            res
                .on('close', () => {
                    file.destroy();
                });
    }
    function receiveFile(fileName, req, res) {
        let size = 0;
        let file = fs.createWriteStream(fileName, {flags:'wx'});

        if(req.headers['Content-Length'] > config.maxFileSize) {
            res.statusCode = 413;
            res.end('File is too big');
            return;
        }

        req
            .on('data', chunk => {
                
                size += chunk.length;
                
                if(size > config.maxFileSize) {
                    res.statusCode = 413;
                    res.setHeader('Connection', 'close');
                    res.end('File is too big');
                    file.destroy();
                    fs.unlink(fileName, (err) => {

                    });
                }
            })
            .on('close', () =>{
                file.destroy();
            })
            .pipe(file);

        file
            .on('error', (err) =>{
                if(err.code === 'EEXIST') {
                    res.statusCode = 409;
                    res.end('File already exist');
                } else {
                    res.statusCode = 500;
                    res.end('Server error');
                }
                fs.unlink(fileName, (err) => {

                });
            })
            .on('close', () => {
                res.end('ok');
            });
    }
    function deleteFile(fileName, req) {
        if(!fs.existsSync(fileName)) {
            res.statusCode = 404;
            res.end('Nothing found');
            return;
        }
        fs.unlink(fileName , (err) => {
            if(err) {
                res.statusCode = 500;
                res.end('Server error');
                return;
            } 
            res.end('ok');
        });
    }
});
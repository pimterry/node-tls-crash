const https = require('https');
const tls = require('tls');
const fs = require('fs');

const { CA } = require('mockttp/dist/util/tls');

const port = 8000;

const caKey = fs.readFileSync('./test-ca.key');
const caCert = fs.readFileSync('./test-ca.pem');

const ca = new CA(caKey, caCert);

const serverCert = ca.generateCertificate('localhost');
const server = https.createServer({
    key: caKey,
    cert: caCert,
    ca: [caCert],
    SNICallback: (domain, cb) => {
        const generatedCert = ca.generateCertificate(domain);
        cb(null, tls.createSecureContext(generatedCert));
    }
});

server.addListener('connect', (req, socket, head) => {
    console.log(`Proxying request to ${req.url}`);
    let [ targetHost, port ] = req.url.split(':');
    port = parseInt(port, 10);

    // Note that the CA caches generated certificates by domain, so this is typically fairly cheap.
    // This is pure JS with node-forge, source at https://unpkg.com/mockttp@0.4.0/dist/util/tls.js
    const { key, cert } = ca.generateCertificate(targetHost);

    socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', () => {
        let tlsSocket = new tls.TLSSocket(socket, {
            isServer: true,
            secureContext: tls.createSecureContext({
                key,
                cert,
                ca: caCert
            })
        });

        let upstream = tls.connect(port, targetHost, {}, () => {
            upstream.write(head);

            tlsSocket.pipe(upstream);
            upstream.pipe(tlsSocket);
        });

        upstream.on('error', (e) => {
            console.log(`Upstream error for ${targetHost}`, e);
            socket.destroy(e);
        });
    });
});

server.listen(port, (err) => console.log(err || `Listening on ${port}`));
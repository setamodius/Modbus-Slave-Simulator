const Modbus = require('jsmodbus');
const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const chalk = require('chalk');
const path = require('path');
const open = require('open');

const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer);

// pkg için path çözümlemesi
const publicPath = process.pkg 
    ? path.join(path.dirname(process.execPath), 'public')
    : path.join(__dirname, 'public');

// Veri yapısı
const data = {
    coils: new Array(65536).fill(false),              // 0xxxx - Coils
    discreteInputs: new Array(65536).fill(false),     // 1xxxx - Discrete Inputs
    inputRegisters: new Array(65536).fill(0),         // 3xxxx - Input Registers
    holdingRegisters: new Array(65536).fill(0)        // 4xxxx - Holding Registers
};

// Bağlı clientları takip etmek için
const connectedClients = new Map();

// Modbus sunucusunu oluştur
const netServer = new net.Server();
const modbusServer = new Modbus.server.TCP(netServer, {
    holding: Buffer.alloc(65536 * 2),  // Her register 2 byte
    coils: Buffer.alloc(65536),
    input: Buffer.alloc(65536 * 2),
    discrete: Buffer.alloc(65536)
});

// Register değerlerini buffer'a yaz
function updateModbusBuffers() {
    // Holding registers
    for (let i = 0; i < data.holdingRegisters.length; i++) {
        modbusServer.holding.writeUInt16BE(data.holdingRegisters[i], i * 2);
    }
    // Coils
    for (let i = 0; i < data.coils.length; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        const currentByte = modbusServer.coils[byteIndex] || 0;
        modbusServer.coils[byteIndex] = data.coils[i] 
            ? currentByte | (1 << bitIndex)
            : currentByte & ~(1 << bitIndex);
    }
    // Input registers
    for (let i = 0; i < data.inputRegisters.length; i++) {
        modbusServer.input.writeUInt16BE(data.inputRegisters[i], i * 2);
    }
    // Discrete inputs
    for (let i = 0; i < data.discreteInputs.length; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        const currentByte = modbusServer.discrete[byteIndex] || 0;
        modbusServer.discrete[byteIndex] = data.discreteInputs[i]
            ? currentByte | (1 << bitIndex)
            : currentByte & ~(1 << bitIndex);
    }
}

// Register değerlerini güncellerken buffer'ı da güncelle
modbusServer.on('preWriteMultipleRegisters', function (request, cb) {
    const start = request.address;
    const values = request.values;
    values.forEach((value, index) => {
        data.holdingRegisters[start + index] = value;
        modbusServer.holding.writeUInt16BE(value, (start + index) * 2);
        io.emit('registerUpdate', { 
            type: 'holding', 
            register: start + index, 
            value: value 
        });
    });
    cb();
});

modbusServer.on('preWriteMultipleCoils', function (request, cb) {
    const start = request.address;
    const values = request.values;
    values.forEach((value, index) => {
        data.coils[start + index] = value;
        const byteIndex = Math.floor((start + index) / 8);
        const bitIndex = (start + index) % 8;
        const currentByte = modbusServer.coils[byteIndex] || 0;
        modbusServer.coils[byteIndex] = value
            ? currentByte | (1 << bitIndex)
            : currentByte & ~(1 << bitIndex);
        io.emit('registerUpdate', { 
            type: 'coils', 
            register: start + index, 
            value: value 
        });
    });
    cb();
});

// İlk başlangıçta buffer'ları güncelle
updateModbusBuffers();

// Client bağlantılarını dinle
netServer.on('connection', function(socket) {
    const clientInfo = {
        ip: socket.remoteAddress.replace(/^.*:/, ''),
        slaveId: 1,  // jsmodbus varsayılan olarak 1 kullanır
        lastActive: new Date()
    };
    
    connectedClients.set(socket.remoteAddress, clientInfo);
    io.emit('clientUpdate', Array.from(connectedClients.values()));
    
    console.log(chalk.green(`Yeni Modbus client bağlandı: ${clientInfo.ip}`));
    
    socket.on('data', function() {
        clientInfo.lastActive = new Date();
        io.emit('clientUpdate', Array.from(connectedClients.values()));
    });
    
    socket.on('end', function() {
        connectedClients.delete(socket.remoteAddress);
        io.emit('clientUpdate', Array.from(connectedClients.values()));
        console.log(chalk.red(`Modbus client bağlantısı kesildi: ${clientInfo.ip}`));
    });
    
    socket.on('error', function(err) {
        console.error(chalk.red(`Client hatası (${clientInfo.ip}):`, err.message));
    });
});

// Modbus sunucusunu başlat
netServer.listen(502, '0.0.0.0', function() {
    console.log(chalk.blue('Modbus TCP Sunucusu başlatıldı (Port: 502)'));
});

// Web sunucusu ayarları
app.use(express.static(publicPath));
app.use(express.json());

// Web API endpoint'leri
app.get('/api/registers/:type', (req, res) => {
    const type = req.params.type;
    switch(type) {
        case 'coils':
            res.json(data.coils);
            break;
        case 'discrete':
            res.json(data.discreteInputs);
            break;
        case 'input':
            res.json(data.inputRegisters);
            break;
        case 'holding':
            res.json(data.holdingRegisters);
            break;
        default:
            res.status(400).json({ error: 'Geçersiz register tipi' });
    }
});

app.post('/api/register/:type/:id', (req, res) => {
    const type = req.params.type;
    const id = parseInt(req.params.id);
    const value = req.body.value;
    
    if (id >= 0 && id < 65536) {
        switch(type) {
            case 'coils':
                data.coils[id] = Boolean(value);
                // Buffer'ı güncelle
                const coilByteIndex = Math.floor(id / 8);
                const coilBitIndex = id % 8;
                const currentCoilByte = modbusServer.coils[coilByteIndex] || 0;
                modbusServer.coils[coilByteIndex] = Boolean(value)
                    ? currentCoilByte | (1 << coilBitIndex)
                    : currentCoilByte & ~(1 << coilBitIndex);
                io.emit('registerUpdate', { type: 'coils', register: id, value: Boolean(value) });
                break;

            case 'discrete':
                data.discreteInputs[id] = Boolean(value);
                // Buffer'ı güncelle
                const discreteByteIndex = Math.floor(id / 8);
                const discreteBitIndex = id % 8;
                const currentDiscreteByte = modbusServer.discrete[discreteByteIndex] || 0;
                modbusServer.discrete[discreteByteIndex] = Boolean(value)
                    ? currentDiscreteByte | (1 << discreteBitIndex)
                    : currentDiscreteByte & ~(1 << discreteBitIndex);
                io.emit('registerUpdate', { type: 'discrete', register: id, value: Boolean(value) });
                break;

            case 'input':
                data.inputRegisters[id] = parseInt(value);
                // Buffer'ı güncelle
                modbusServer.input.writeUInt16BE(parseInt(value), id * 2);
                io.emit('registerUpdate', { type: 'input', register: id, value: parseInt(value) });
                break;

            case 'holding':
                data.holdingRegisters[id] = parseInt(value);
                // Buffer'ı güncelle
                modbusServer.holding.writeUInt16BE(parseInt(value), id * 2);
                io.emit('registerUpdate', { type: 'holding', register: id, value: parseInt(value) });
                break;

            default:
                return res.status(400).json({ success: false, error: 'Geçersiz register tipi' });
        }
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz adres' });
    }
});

// API endpoint'i ekle
app.get('/api/clients', (req, res) => {
    res.json(Array.from(connectedClients.values()));
});

// Hata yakalama ekleyelim
process.on('uncaughtException', function(err) {
    console.error(chalk.red('Beklenmeyen hata:', err));
});

// Temiz kapatma için
process.on('SIGINT', function() {
    console.log(chalk.yellow('\nUygulama kapatılıyor...'));
    process.exit();
});

// Web sunucusunu başlat
const WEB_PORT = 3000;
httpServer.listen(WEB_PORT, () => {
    console.log(chalk.blue(`Web sunucusu başlatıldı: http://localhost:${WEB_PORT}`));
    open(`http://localhost:${WEB_PORT}`);
}); 
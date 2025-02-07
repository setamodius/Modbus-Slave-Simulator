The executable will be created in the `dist` folder as `modbus-simulator.exe`.

## Usage

1. Start the application (via exe or npm start)
2. Open your web browser and navigate to `http://localhost:3000`
3. Select register type (Coils, Discrete Inputs, Input Registers, Holding Registers)
4. Choose register range
5. Modify register values:
   - Use checkboxes for Coils and Discrete Inputs
   - Enter values (0-65535) for Input and Holding Registers

## Modbus Client Connection

- Connect your Modbus TCP client to `localhost:502`
- Default Slave ID: 1
- View connected clients in the web interface

## Development

### Project Structure

```
modbus-simulator/
├── index.js          # Main application code
├── public/           # Web interface files
│   └── index.html    # Web interface
├── package.json      # Project configuration
└── README.md         # Documentation
```

### Technologies Used

- Node.js
- Express.js
- Socket.IO
- jsmodbus
- HTML/CSS/JavaScript

### Key Features

- Real-time register updates
- Web-based interface
- Dark/Light theme support
- Connected client monitoring
- Register range selection
- Preset ranges for quick access
- Responsive design for all screen sizes

## Building

The application can be built into a standalone executable using:
```bash
npm run build
```

This will create:
- `modbus-simulator.exe` - Main executable
- Required assets in the `dist` folder

## API Endpoints

- `GET /api/registers/:type` - Get all registers of specified type
- `POST /api/register/:type/:id` - Update specific register
- `GET /api/clients` - Get list of connected clients

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

Common issues:
- Port 502 already in use: Close other Modbus applications
- Access denied: Run as administrator
- Web interface not loading: Check if port 3000 is available

## License

MIT

## Contact

krmbil@gmail.com

## Acknowledgments

- jsmodbus library
- Socket.IO for real-time updates
- Express.js framework

# Modbus TCP Simulator

A Modbus TCP simulator with a web interface for testing and simulating Modbus TCP devices. View and modify Modbus registers through an intuitive web interface.

## Features

- Modbus TCP Server (Port 502)
- Web Interface (Port 3000)
- Supported Modbus Functions:
  - Coils (0xxxx)
  - Discrete Inputs (1xxxx)
  - Input Registers (3xxxx)
  - Holding Registers (4xxxx)
- 65536 addresses for each register type
- Real-time updates
- Dark/Light theme
- Connected Modbus clients list
- Register range selection
- Range presets
- Responsive design

## Usage

1. Start the application
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


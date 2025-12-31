# govee-api

A TypeScript client library for interacting with Govee smart devices via the official Govee API.

## Installation

```bash
npm install github:chrisgander/govee-api
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "govee-api": "github:chrisgander/govee-api"
  }
}
```

## Requirements

- Node.js 18+ (uses `fetch` and `crypto.randomUUID`)
- A Govee API key (obtain from the Govee app under Settings > About Us > Apply for API Key)

## Usage

### Basic Setup

```typescript
import { GoveeClient } from "govee-api";

const client = new GoveeClient({
  apiKey: "your-api-key",
});
```

### Get All Devices

```typescript
const devices = await client.getDevices();
console.log(devices);
// [{ sku: "H5100", device: "XX:XX:XX:XX:XX:XX", deviceName: "Living Room", ... }]
```

### Get Device State

```typescript
const state = await client.getDeviceState("XX:XX:XX:XX:XX:XX", "H5100");
console.log(state.capabilities);
```

### Get Temperature/Humidity Readings

For Govee temperature/humidity sensors (default: H5100):

```typescript
const { readings, failedDevices } = await client.getReadings();

for (const reading of readings) {
  console.log(`${reading.device}: ${reading.temperatureC}°C, ${reading.humidity}%`);
}
```

## Configuration

```typescript
const client = new GoveeClient({
  apiKey: "your-api-key",           // Required
  baseUrl: "https://custom.url",    // Optional, defaults to Govee API
  targetModel: "H5101",             // Optional, defaults to "H5100"
});
```

## API Reference

### `GoveeClient`

#### Constructor

- `new GoveeClient(config: GoveeClientConfig)`

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getDevices()` | `Promise<GoveeDevice[]>` | Fetch all devices associated with your account |
| `getDeviceState(device, sku)` | `Promise<DeviceStatePayload>` | Get current state of a specific device |
| `getReadings()` | `Promise<ReadingsResult>` | Get temperature/humidity readings from sensors |

### `fahrenheitToCelsius(f: number): number`

Utility function to convert Fahrenheit to Celsius.

### Types

```typescript
interface GoveeDevice {
  sku: string;
  device: string;
  deviceName: string;
  capabilities: Array<{ type: string; instance: string; parameters?: unknown }>;
}

interface DeviceReading {
  deviceId: string;
  device: string;
  temperatureF: number;
  temperatureC: number;
  humidity: number;
  timestamp: Date;
}

interface ReadingsResult {
  readings: DeviceReading[];
  failedDevices: string[];
}

interface GoveeClientConfig {
  apiKey: string;
  baseUrl?: string;
  targetModel?: string;
}
```

## Error Handling

The client throws errors for API failures:

```typescript
try {
  const devices = await client.getDevices();
} catch (error) {
  if (error.message.includes("Rate limit")) {
    // Handle rate limiting - wait and retry
  }
}
```

## Disclaimer

This software is provided "AS-IS" without warranty of any kind. This is an unofficial library and is not affiliated with, endorsed by, or supported by Govee. Use at your own risk.

## License

MIT

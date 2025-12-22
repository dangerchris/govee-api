/**
 * Govee API type definitions
 */

export interface GoveeDevice {
  sku: string;
  device: string;
  deviceName: string;
  capabilities: Array<{ type: string; instance: string; parameters?: unknown }>;
}

export interface DevicesResponse {
  code: number;
  message: string;
  data: GoveeDevice[];
}

export interface DeviceStateResponse {
  code: number;
  msg: string;
  payload: DeviceStatePayload;
}

export interface DeviceStatePayload {
  sku: string;
  device: string;
  capabilities: Array<{
    type: string;
    instance: string;
    state: { value: unknown };
  }>;
}

export interface DeviceReading {
  deviceId: string;
  device: string;
  temperatureF: number;
  temperatureC: number;
  humidity: number;
  timestamp: Date;
}

export interface ReadingsResult {
  readings: DeviceReading[];
  failedDevices: string[];
}

export interface GoveeClientConfig {
  apiKey: string;
  baseUrl?: string;
  targetModel?: string;
}

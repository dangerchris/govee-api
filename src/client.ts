/**
 * Govee API client
 */

import type {
  GoveeDevice,
  DevicesResponse,
  DeviceStateResponse,
  DeviceStatePayload,
  DeviceCapabilityCommand,
  DeviceControlResponse,
  DeviceReading,
  ReadingsResult,
  GoveeClientConfig,
} from "./types.ts";

const DEFAULT_BASE_URL = "https://openapi.api.govee.com";
const DEFAULT_TARGET_MODEL = "H5100";

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export class GoveeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly targetModel: string;

  constructor(config: GoveeClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.targetModel = config.targetModel ?? DEFAULT_TARGET_MODEL;
  }

  /**
   * Generic Govee API request handler
   */
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait a moment before trying again."
        );
      }
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch all devices from the Govee API
   */
  async getDevices(): Promise<GoveeDevice[]> {
    const data = await this.makeRequest<DevicesResponse>(
      "/router/api/v1/user/devices",
      "GET"
    );

    if (data.code !== 200) {
      throw new Error(`API error: ${data.message}`);
    }

    return data.data;
  }

  /**
   * Fetch state for a specific device
   */
  async getDeviceState(device: string, sku: string): Promise<DeviceStatePayload> {
    const data = await this.makeRequest<DeviceStateResponse>(
      "/router/api/v1/device/state",
      "POST",
      {
        requestId: crypto.randomUUID(),
        payload: { sku, device },
      }
    );

    if (data.code !== 200) {
      throw new Error(`API error: ${data.msg}`);
    }

    return data.payload;
  }

  /**
   * Send a capability command to a device (e.g. powerSwitch, brightness, colorRgb)
   */
  async controlDevice(
    device: string,
    sku: string,
    capability: DeviceCapabilityCommand
  ): Promise<void> {
    const data = await this.makeRequest<DeviceControlResponse>(
      "/router/api/v1/device/control",
      "POST",
      {
        requestId: crypto.randomUUID(),
        payload: { sku, device, capability },
      }
    );

    if (data.code !== 200) {
      throw new Error(`API error: ${data.msg}`);
    }
  }

  /**
   * Turn a device on or off
   */
  async setPower(device: string, sku: string, on: boolean): Promise<void> {
    await this.controlDevice(device, sku, {
      type: "devices.capabilities.on_off",
      instance: "powerSwitch",
      value: on ? 1 : 0,
    });
  }

  /**
   * Get temperature and humidity readings from sensors
   */
  async getReadings(): Promise<ReadingsResult> {
    const allDevices = await this.getDevices();
    const devices = allDevices.filter((d) => d.sku === this.targetModel);

    const readings: DeviceReading[] = [];
    const failedDevices: string[] = [];
    const timestamp = new Date();

    for (const device of devices) {
      try {
        const state = await this.getDeviceState(device.device, device.sku);

        let temperature: number | undefined;
        let humidity: number | undefined;

        for (const cap of state.capabilities) {
          if (
            cap.instance === "sensorTemperature" &&
            typeof cap.state.value === "number"
          ) {
            temperature = cap.state.value;
          }
          if (
            cap.instance === "sensorHumidity" &&
            typeof cap.state.value === "number"
          ) {
            humidity = cap.state.value;
          }
        }

        if (temperature !== undefined && humidity !== undefined) {
          readings.push({
            deviceId: device.device,
            device: device.deviceName,
            temperatureF: Math.round(temperature * 10) / 10,
            temperatureC: Math.round(fahrenheitToCelsius(temperature) * 10) / 10,
            humidity: Math.round(humidity * 10) / 10,
            timestamp,
          });
        }
      } catch {
        failedDevices.push(device.deviceName);
      }
    }

    return { readings, failedDevices };
  }
}

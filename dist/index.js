// src/client.ts
var DEFAULT_BASE_URL = "https://openapi.api.govee.com";
var DEFAULT_TARGET_MODEL = "H5100";
function fahrenheitToCelsius(f) {
  return (f - 32) * 5 / 9;
}

class GoveeClient {
  apiKey;
  baseUrl;
  targetModel;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.targetModel = config.targetModel ?? DEFAULT_TARGET_MODEL;
  }
  async makeRequest(endpoint, method = "GET", body) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": this.apiKey
      },
      ...body ? { body: JSON.stringify(body) } : {}
    });
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  async getDevices() {
    const data = await this.makeRequest("/router/api/v1/user/devices", "GET");
    if (data.code !== 200) {
      throw new Error(`API error: ${data.message}`);
    }
    return data.data;
  }
  async getDeviceState(device, sku) {
    const data = await this.makeRequest("/router/api/v1/device/state", "POST", {
      requestId: crypto.randomUUID(),
      payload: { sku, device }
    });
    if (data.code !== 200) {
      throw new Error(`API error: ${data.msg}`);
    }
    return data.payload;
  }
  async getReadings() {
    const allDevices = await this.getDevices();
    const devices = allDevices.filter((d) => d.sku === this.targetModel);
    const readings = [];
    const failedDevices = [];
    const timestamp = new Date;
    for (const device of devices) {
      try {
        const state = await this.getDeviceState(device.device, device.sku);
        let temperature;
        let humidity;
        for (const cap of state.capabilities) {
          if (cap.instance === "sensorTemperature" && typeof cap.state.value === "number") {
            temperature = cap.state.value;
          }
          if (cap.instance === "sensorHumidity" && typeof cap.state.value === "number") {
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
            timestamp
          });
        }
      } catch {
        failedDevices.push(device.deviceName);
      }
    }
    return { readings, failedDevices };
  }
}
export {
  fahrenheitToCelsius,
  GoveeClient
};

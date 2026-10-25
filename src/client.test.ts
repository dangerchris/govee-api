import { describe, it, expect, mock, beforeEach } from "bun:test";
import { GoveeClient, fahrenheitToCelsius } from "./client.ts";

describe("fahrenheitToCelsius", () => {
  it("converts freezing point correctly", () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
  });

  it("converts boiling point correctly", () => {
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it("converts room temperature correctly", () => {
    expect(fahrenheitToCelsius(68)).toBeCloseTo(20, 1);
  });

  it("handles negative temperatures", () => {
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });
});

describe("GoveeClient", () => {
  describe("constructor", () => {
    it("creates client with required config", () => {
      const client = new GoveeClient({ apiKey: "test-key" });
      expect(client).toBeInstanceOf(GoveeClient);
    });

    it("accepts optional baseUrl", () => {
      const client = new GoveeClient({
        apiKey: "test-key",
        baseUrl: "https://custom.api.com",
      });
      expect(client).toBeInstanceOf(GoveeClient);
    });

    it("accepts optional targetModel", () => {
      const client = new GoveeClient({
        apiKey: "test-key",
        targetModel: "H5101",
      });
      expect(client).toBeInstanceOf(GoveeClient);
    });
  });

  describe("getDevices", () => {
    beforeEach(() => {
      mock.restore();
    });

    it("returns devices on successful response", async () => {
      const mockDevices = [
        {
          sku: "H5100",
          device: "AA:BB:CC:DD:EE:FF",
          deviceName: "Living Room",
          capabilities: [],
        },
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 200, message: "ok", data: mockDevices }),
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "test-key" });
      const devices = await client.getDevices();

      expect(devices).toEqual(mockDevices);
    });

    it("throws error on API error response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 401, message: "Invalid API key" }),
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "bad-key" });

      expect(client.getDevices()).rejects.toThrow("API error: Invalid API key");
    });

    it("throws error on rate limit", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "test-key" });

      expect(client.getDevices()).rejects.toThrow("Rate limit exceeded");
    });

    it("throws error on HTTP failure", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "test-key" });

      expect(client.getDevices()).rejects.toThrow("API request failed: 500");
    });
  });

  describe("getDeviceState", () => {
    beforeEach(() => {
      mock.restore();
    });

    it("returns device state on successful response", async () => {
      const mockPayload = {
        sku: "H5100",
        device: "AA:BB:CC:DD:EE:FF",
        capabilities: [
          { type: "devices.capabilities.sensor", instance: "sensorTemperature", state: { value: 72 } },
          { type: "devices.capabilities.sensor", instance: "sensorHumidity", state: { value: 45 } },
        ],
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 200, msg: "ok", payload: mockPayload }),
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "test-key" });
      const state = await client.getDeviceState("AA:BB:CC:DD:EE:FF", "H5100");

      expect(state).toEqual(mockPayload);
    });
  });

  describe("getReadings", () => {
    beforeEach(() => {
      mock.restore();
    });

    it("returns readings from matching devices", async () => {
      const mockDevices = [
        { sku: "H5100", device: "AA:BB:CC:DD:EE:FF", deviceName: "Living Room", capabilities: [] },
        { sku: "H5100", device: "11:22:33:44:55:66", deviceName: "Bedroom", capabilities: [] },
        { sku: "H7000", device: "XX:XX:XX:XX:XX:XX", deviceName: "Light", capabilities: [] },
      ];

      const mockState = {
        sku: "H5100",
        device: "AA:BB:CC:DD:EE:FF",
        capabilities: [
          { type: "devices.capabilities.sensor", instance: "sensorTemperature", state: { value: 72 } },
          { type: "devices.capabilities.sensor", instance: "sensorHumidity", state: { value: 45 } },
        ],
      };

      let callCount = 0;
      globalThis.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ code: 200, message: "ok", data: mockDevices }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 200, msg: "ok", payload: mockState }),
        } as Response);
      });

      const client = new GoveeClient({ apiKey: "test-key" });
      const result = await client.getReadings();

      expect(result.readings.length).toBe(2);
      expect(result.readings[0].temperatureF).toBe(72);
      expect(result.readings[0].temperatureC).toBeCloseTo(22.2, 1);
      expect(result.readings[0].humidity).toBe(45);
      expect(result.failedDevices.length).toBe(0);
    });

    it("tracks failed devices", async () => {
      const mockDevices = [
        { sku: "H5100", device: "AA:BB:CC:DD:EE:FF", deviceName: "Living Room", capabilities: [] },
      ];

      let callCount = 0;
      globalThis.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ code: 200, message: "ok", data: mockDevices }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response);
      });

      const client = new GoveeClient({ apiKey: "test-key" });
      const result = await client.getReadings();

      expect(result.readings.length).toBe(0);
      expect(result.failedDevices).toEqual(["Living Room"]);
    });
  });

  describe("setPower", () => {
    beforeEach(() => {
      mock.restore();
    });

    it("sends a powerSwitch control command", async () => {
      const fetchMock = mock((_url: string, _init: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 200, msg: "success" }),
        } as Response)
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const client = new GoveeClient({ apiKey: "test-key" });
      await client.setPower("AA:BB:CC:DD:EE:FF", "H6008", true);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://openapi.api.govee.com/router/api/v1/device/control");
      expect(JSON.parse(init.body as string).payload).toEqual({
        sku: "H6008",
        device: "AA:BB:CC:DD:EE:FF",
        capability: { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 1 },
      });
    });

    it("throws error on API error response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 400, msg: "Device offline" }),
        } as Response)
      );

      const client = new GoveeClient({ apiKey: "test-key" });

      expect(client.setPower("AA:BB:CC:DD:EE:FF", "H6008", false)).rejects.toThrow(
        "API error: Device offline"
      );
    });
  });
});

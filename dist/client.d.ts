/**
 * Govee API client
 */
import type { GoveeDevice, DeviceStatePayload, ReadingsResult, GoveeClientConfig } from "./types.ts";
export declare function fahrenheitToCelsius(f: number): number;
export declare class GoveeClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly targetModel;
    constructor(config: GoveeClientConfig);
    /**
     * Generic Govee API request handler
     */
    private makeRequest;
    /**
     * Fetch all devices from the Govee API
     */
    getDevices(): Promise<GoveeDevice[]>;
    /**
     * Fetch state for a specific device
     */
    getDeviceState(device: string, sku: string): Promise<DeviceStatePayload>;
    /**
     * Get temperature and humidity readings from sensors
     */
    getReadings(): Promise<ReadingsResult>;
}
//# sourceMappingURL=client.d.ts.map
import { type Device, findDevice } from '@neruz/devices';

let customById = new Map<string, Device>();

export function registerCustomDevices(devices: readonly Device[]): void {
  customById = new Map(devices.map((device) => [device.id, device]));
}

export const findAnyDevice = (id: string): Device | undefined =>
  findDevice(id) ?? customById.get(id);

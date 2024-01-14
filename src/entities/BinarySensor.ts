import { BinarySensorEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"

export type BinarySensorState = "on" | "off" | "unavailable"
export type BinarySensorAttributes = {}
export type BinarySensorEvent = "toggle" | "on" | "off"

export class BinarySensor extends Entity<
	BinarySensorEntityName,
	BinarySensorState,
	BinarySensorAttributes,
	BinarySensorEvent
> {
	public get isOn() {
		return this._state === "on"
	}

	public get isOff() {
		return this._state === "off"
	}

	protected override onStateChange(oldState: BinarySensorState, oldAttributes: BinarySensorAttributes): void {
		if (oldState === "unavailable") return
		if (oldState !== this._state) {
			this.fire("toggle")
			if (this._state === "on") this.fire("on")
			else if (this._state === "off") this.fire("off")
		}
	}
}

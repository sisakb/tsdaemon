import { BinarySensorEntityName } from "../HassTypes.js"
import { Entity } from "./Entity.js"

type MotionSensorState = "on" | "off" | "unavailable"
type MotionSensorAttributes = {
	occupancy: boolean
	tamper: boolean
}
type MotionSensorEvent = "toggle" | "occupied" | "clear"

export class MotionSensor extends Entity<
	BinarySensorEntityName,
	MotionSensorState,
	MotionSensorAttributes,
	MotionSensorEvent
> {
	public get isOccupied() {
		return this._state === "on"
	}

	public onMotion(callback: () => void) {
		this.on("occupied", callback)
	}

	public onClear(callback: () => void) {
		this.on("clear", callback)
	}

	protected override onStateChange(oldState: MotionSensorState, oldAttributes: MotionSensorAttributes): void {
		if (oldState === "unavailable") return
		if (oldState !== this._state) {
			this.fire("toggle")
			if (this._state === "on") this.fire("occupied")
			else if (this._state === "off") this.fire("clear")
		}
	}
}
